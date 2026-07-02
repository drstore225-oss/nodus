import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Sparkles,
  Send,
  Loader2,
  Building,
  Activity,
  DollarSign,
  Minus
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

export const NodusAIChatbot: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbGeminiKey, setDbGeminiKey] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mensagem inicial de boas-vindas
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Olá! Sou a **IA do Nodus** 🧠. Estou conectada ao banco de dados da sua instituição para te ajudar a analisar a **eficiência dos espaços ($m^2$)** e a **produtividade da manutenção**.\n\nEscolha uma das sugestões rápidas abaixo ou me faça uma pergunta personalizada!',
        timestamp: new Date()
      }
    ]);
  }, []);

  // Buscar estatísticas do banco de dados ao abrir o chat
  useEffect(() => {
    if (isOpen && profile?.institution_id && !dbStats) {
      loadStats(profile.institution_id);
    }
  }, [isOpen, profile, dbStats]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadStats = async (institutionId: string) => {
    try {
      // 1. Prédios
      const { data: bData } = await supabase
        .from('buildings')
        .select('id, name, total_m2')
        .eq('institution_id', institutionId);

      // 2. Perfis (Técnicos)
      const { data: pData } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('institution_id', institutionId);

      // 3. Chamados (Tickets)
      const { data: tData } = await supabase
        .from('tickets')
        .select('id, status, priority, category, sla_breached, actual_cost, estimated_cost, building_id')
        .eq('institution_id', institutionId);

      // 4. Obras
      const { data: oData } = await supabase
        .from('obras')
        .select('id, title, status')
        .eq('institution_id', institutionId);

      setDbStats({
        buildings: bData || [],
        profiles: pData || [],
        tickets: tData || [],
        obras: oData || []
      });

      // 5. Institution (Gemini API Key)
      try {
        const { data: instData } = await supabase
          .from('institutions')
          .select('gemini_api_key')
          .eq('id', institutionId)
          .single();

        if (instData?.gemini_api_key) {
          setDbGeminiKey(instData.gemini_api_key);
        }
      } catch (err) {
        console.warn('Erro ao carregar chave do Gemini do banco:', err);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas para IA:', err);
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const geminiKey = dbGeminiKey?.trim() || localStorage.getItem('nodus_gemini_api_key')?.trim();
      const stats = dbStats || { buildings: [], profiles: [], tickets: [], obras: [] };

      // Computar métricas básicas no frontend
      const totalM2 = stats.buildings.reduce((acc: number, b: any) => acc + parseFloat(b.total_m2 || 0), 0);
      const techsCount = stats.profiles.filter((p: any) => p.role === 'TECNICO').length;
      const totalTickets = stats.tickets.length;
      const resolvedTickets = stats.tickets.filter((t: any) => t.status === 'RESOLVED').length;
      const openTickets = stats.tickets.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
      const slaBreached = stats.tickets.filter((t: any) => t.sla_breached).length;
      const actualCost = stats.tickets.reduce((acc: number, t: any) => acc + parseFloat(t.actual_cost || 0), 0);

      // Verificação rápida de intenção do usuário para respostas analíticas locais personalizadas
      const textLower = textToSend.toLowerCase();
      const isM2Query = textLower.includes('m²') || textLower.includes('metro') || textLower.includes('espaço') || textLower.includes('eficiência');
      const isSlaQuery = textLower.includes('sla') || textLower.includes('equipe') || textLower.includes('colaborador') || textLower.includes('produtividade') || textLower.includes('técnico');
      const isCostQuery = textLower.includes('custo') || textLower.includes('orçamento') || textLower.includes('gasto') || textLower.includes('financeiro');

      if (geminiKey) {
        // --- MODO INTEGRAÇÃO REAL (API GEMINI FLASH 1.5) ---
        const prompt = `
Você é o Nodus AI Assistant, especialista em eficiência de espaços, manutenção predial e engenharia de facilities.
Abaixo estão os dados consolidados da instituição do usuário em tempo real:
- Área total: ${totalM2} m² cadastrados divididos em ${stats.buildings.length} prédios.
- Lista de Prédios: ${stats.buildings.map((b: any) => `${b.name} (${b.total_m2} m²)`).join(', ')}.
- Equipe de Manutenção: ${techsCount} técnicos ativos.
- Chamados: ${totalTickets} chamados totais (${openTickets} abertos/em andamento, ${resolvedTickets} resolvidos).
- Qualidade e SLA: ${slaBreached} chamados estouraram o prazo do SLA.
- Custos: R$ ${actualCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} acumulado de despesa real.
- Obras ativas: ${stats.obras.filter((o: any) => o.status === 'IN_PROGRESS').length} em andamento de um total de ${stats.obras.length} obras.

Pergunta do usuário: "${textToSend}"

Escreva uma resposta muito perspicaz, trazendo insights de eficiência ou gargalos baseados nos dados acima. Use tabelas ou marcadores em Markdown para facilitar a leitura. Mantenha a resposta direta e objetiva. Fale em português brasileiro.
`;

        // Descobrir dinamicamente qual modelo de chat está disponível na chave do usuário
        let availableModel = 'gemini-1.5-flash';
        try {
          const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
          if (listResponse.ok) {
            const listData = await listResponse.json();
            const models = listData.models || [];
            
            // Preferência de modelos (do melhor/mais disponível para o usuário)
            const preferenceList = [
              'models/gemini-2.5-flash',
              'models/gemini-2.0-flash',
              'models/gemini-1.5-flash',
              'models/gemini-1.5-flash-latest',
              'models/gemini-1.5-pro',
              'models/gemini-1.5-flash-8b'
            ];
            
            const foundModel = preferenceList.find(pref => 
              models.some((m: any) => m.name === pref && m.supportedGenerationMethods?.includes('generateContent'))
            );
            
            if (foundModel) {
              availableModel = foundModel.replace('models/', '');
            } else {
              const anyGenerateModel = models.find((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
              if (anyGenerateModel) {
                availableModel = anyGenerateModel.name.replace('models/', '');
              }
            }
          }
        } catch (e) {
          console.warn('Erro ao listar modelos do Gemini:', e);
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${availableModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        if (!response.ok) {
          let errorMsg = 'Erro na API do Gemini. Verifique a chave de API nas Configurações.';
          try {
            const errData = await response.json();
            if (errData.error?.message) {
              errorMsg = `Erro na API do Gemini: ${errData.error.message} (Modelo utilizado: ${availableModel})`;
            }
          } catch (_) {}
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui processar a resposta.';

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'ai',
            text: responseText,
            timestamp: new Date()
          }
        ]);
      } else {
        // --- MODO ANALÍTICO LOCAL (FALLBACK DE IA) ---
        let responseText = '';

        if (isM2Query) {
          // Análise de eficiência por Prédio
          const buildingAnalysis = stats.buildings.map((b: any) => {
            const bTickets = stats.tickets.filter((t: any) => t.building_id === b.id);
            const m2 = parseFloat(b.total_m2) || 1;
            const density = bTickets.length / m2;
            return {
              name: b.name,
              m2: m2,
              ticketsCount: bTickets.length,
              density: density
            };
          }).sort((a: any, b: any) => b.density - a.density);

          responseText = `### 📊 Análise de Eficiência por Prédio ($m^2$)
Aqui está o relatório gerado localmente baseado na densidade de chamados por metro quadrado:

| Prédio | Área | Chamados | Densidade (Chamados / $m^2$) |
| :--- | :---: | :---: | :---: |
${buildingAnalysis.map((ba: any) => `| **${ba.name}** | ${ba.m2.toLocaleString('pt-BR')} $m^2$ | ${ba.ticketsCount} | ${ba.density.toFixed(4)} |`).join('\n')}

**💡 Insights de Eficiência:**
1. ${buildingAnalysis.length > 0 && buildingAnalysis[0].ticketsCount > 0 
  ? `O **${buildingAnalysis[0].name}** apresenta a maior concentração de incidentes por área (${buildingAnalysis[0].density.toFixed(4)} chamados/$m^2$). Recomendamos programar uma **inspeção preventiva predial** focada neste Bloco para conter desgastes recorrentes.`
  : 'Cadastre prédios em *Configurações* e vincule-os nos chamados/obras para obter análises detalhadas de desgaste por área física.'
}
2. A metragem cadastrada total sob gestão é de **${totalM2.toLocaleString('pt-BR')} $m^2$**. A média global de chamados é de **${totalM2 > 0 ? (totalTickets / totalM2).toFixed(4) : 0} chamados/$m^2$**.`;

        } else if (isSlaQuery) {
          // Análise de produtividade e SLA
          const slaBreachedPct = totalTickets > 0 ? (slaBreached / totalTickets) * 100 : 0;
          responseText = `### ⏱️ Relatório de SLA e Produtividade das Equipes
Estatísticas calculadas a partir do histórico de chamados da organização:

- **Técnicos Ativos:** ${techsCount} colaboradores cadastrados.
- **Chamados Resolvidos:** ${resolvedTickets} chamados finalizados.
- **Acertos (Dentro do SLA):** ${totalTickets - slaBreached} chamados (${(100 - slaBreachedPct).toFixed(1)}%).
- **Erros (Estouro de SLA):** ${slaBreached} chamados (${slaBreachedPct.toFixed(1)}%).

**🎯 Diagnóstico Operacional:**
1. ${slaBreachedPct > 20 
  ? `⚠️ **Alerta de SLA:** A taxa de estouro de prazo está em **${slaBreachedPct.toFixed(1)}%**, o que é considerado alto. Isso pode indicar sobrecarga técnica ou falta de triagem de prioridades.`
  : `✅ **Excelente SLAs:** A equipe mantém um cumprimento de prazo de **${(100 - slaBreachedPct).toFixed(1)}%**, dentro da meta saudável do Nodus.`
}
2. A média de carga de trabalho atual é de **${techsCount > 0 ? (openTickets / techsCount).toFixed(1) : 0} chamados ativos por técnico**.`;

        } else if (isCostQuery) {
          // Relatório financeiro de manutenção
          responseText = `### 💵 Auditoria de Custos de Manutenção
Visão geral dos custos e orçamentos registrados:

- **Despesa Real Acumulada:** R$ ${actualCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- **Média por Chamado:** R$ ${resolvedTickets > 0 ? (actualCost / resolvedTickets).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
- **Custo Médio por $m^2$:** R$ ${totalM2 > 0 ? (actualCost / totalM2).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'} por $m^2$.

**💡 Recomendações Financeiras:**
1. Focar em manutenções **preventivas** (rotinas) para diminuir os chamados corretivos, que historicamente custam até 3x mais.
2. Monitorar centros de custo ativos para evitar desvio orçamentário.`;
        } else {
          // Resposta geral genérica
          responseText = `### 🤖 Assistente Analítico Local
Identifiquei que você está perguntando sobre *"${textToSend}"*. Como você está rodando no **Modo Analítico Local** (sem chave Gemini cadastrada), posso gerar análises focadas. 

Experimente clicar em um dos botões rápidos de análise abaixo ou insira sua **Gemini API Key em Configurações** para ter suporte a respostas livres avançadas!`;
        }

        // Simula um delay para a resposta analítica local parecer natural
        await new Promise((resolve) => setTimeout(resolve, 800));

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: 'ai',
            text: responseText,
            timestamp: new Date()
          }
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: `⚠️ **Erro na IA:** ${err.message || 'Erro ao conectar à API do Gemini. Por favor, valide sua chave nas Configurações.'}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  return (
    <>
      {/* Botão Flutuante (Messenger Style) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center border border-white/20 group"
      >
        <Sparkles className="h-6 w-6 animate-pulse group-hover:rotate-12 transition-transform" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-2 transition-all duration-300 text-xs font-semibold whitespace-nowrap">
          Nodus AI Insights
        </span>
      </button>

      {/* Janela de Chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[380px] sm:w-[400px] h-[550px] bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xl flex flex-col z-50 overflow-hidden transition-all duration-300 animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-lg">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Nodus AI Assistant</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] text-slate-400 font-medium">Online e conectado ao Supabase</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Lista de Mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-slate-700 border border-slate-200/60 rounded-bl-none prose prose-sm prose-slate'
                  }`}
                >
                  {/* Se a mensagem for da IA, podemos formatar de forma simples o markdown */}
                  {msg.sender === 'ai' ? (
                    // Simples conversão de markdown negrito/itálico e listas
                    <div className="space-y-1">
                      {msg.text.split('\n\n').map((para, i) => {
                        if (para.startsWith('### ')) {
                          return <h4 key={i} className="font-bold text-slate-900 border-b border-slate-100 pb-1 mt-2 mb-1">{para.replace('### ', '')}</h4>;
                        }
                        if (para.startsWith('|')) {
                          // Renderiza tabelas de forma simplificada
                          const lines = para.split('\n').filter(Boolean);
                          return (
                            <div key={i} className="overflow-x-auto my-2 border border-slate-200 rounded-lg">
                              <table className="w-full text-xs text-left border-collapse">
                                <tbody>
                                  {lines.map((line, li) => {
                                    if (line.includes(':---')) return null;
                                    const cells = line.split('|').map(c => c.trim()).filter((_, idx) => idx > 0 && idx < line.split('|').length - 1);
                                    const isHeader = li === 0;
                                    return (
                                      <tr key={li} className={isHeader ? 'bg-slate-100 font-bold border-b border-slate-200' : 'border-b border-slate-100 hover:bg-slate-50'}>
                                        {cells.map((cell, ci) => (
                                          <td key={ci} className="px-2 py-1.5">{cell.replace(/\*\*/g, '')}</td>
                                        ))}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                        // Tratar negrito simples e marcadores
                        const formattedText = para.split('\n').map((line, li) => {
                          let cleanLine = line;
                          const isBullet = line.startsWith('- ') || line.startsWith('* ');
                          if (isBullet) {
                            cleanLine = line.substring(2);
                          }
                          
                          // Substitui **texto** por <strong>texto</strong>
                          const parts = cleanLine.split(/\*\*([\s\S]*?)\*\*/g);
                          const renderedLine = parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="font-bold text-slate-900">{part}</strong> : part);

                          if (isBullet) {
                            return <li key={li} className="list-disc ml-4 text-xs text-slate-600 my-0.5">{renderedLine}</li>;
                          }
                          return <p key={li} className="text-slate-600 text-xs leading-normal">{renderedLine}</p>;
                        });
                        return <div key={i}>{formattedText}</div>;
                      })}
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-slate-500 border border-slate-200/60 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2 shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Nodus AI está analisando os dados da instituição...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sugestões Rápidas */}
          {!isLoading && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/50 flex flex-col gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sugestões Rápidas:</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-wrap">
                <button
                  onClick={() => handleQuickQuestion('Calcular chamados por m² dos prédios')}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors font-medium whitespace-nowrap"
                >
                  <Building className="h-3 w-3 inline mr-1" />
                  Eficiência por m²
                </button>
                <button
                  onClick={() => handleQuickQuestion('Análise de produtividade e SLA da equipe')}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors font-medium whitespace-nowrap"
                >
                  <Activity className="h-3 w-3 inline mr-1" />
                  Cumprimento de SLA
                </button>
                <button
                  onClick={() => handleQuickQuestion('Como reduzir custos de manutenção?')}
                  className="text-xs px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors font-medium whitespace-nowrap"
                >
                  <DollarSign className="h-3 w-3 inline mr-1" />
                  Auditoria de Custos
                </button>
              </div>
            </div>
          )}

          {/* Campo de Entrada */}
          <div className="p-3 border-t border-slate-200 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(inputText);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                placeholder="Pergunte sobre m², SLA, custos..."
                className="flex-1 h-9 rounded-xl border border-slate-300 px-3 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:active:scale-100"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
