import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/router";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import { chatWithHealthAI } from "@/lib/aiChat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  getMedicationRemindersByUser,
  createMedicationReminder,
  updateMedicationReminder,
  deleteMedicationReminder,
} from "@/lib/medications";
import {
  getAppointmentRemindersByUser,
  createAppointmentReminder,
  updateAppointmentReminder,
  deleteAppointmentReminder,
} from "@/lib/appointmentReminders";
import {
  getHealthLogsByUser,
  createHealthLog,
  updateHealthLog,
  deleteHealthLog,
} from "@/lib/healthLogs";
import { getCurrentProfile } from "@/lib/profile";
import { fetchUserFiles } from "@/lib/files";
import { toast } from "sonner";

type Role = "user" | "model";

type ChatMessage = {
  role: Role;
  text: string;
};

type ActionEntity = "appointment" | "medication" | "health_log";
type ActionIntent = "create" | "update" | "delete";
type ActionPayload = {
  entity: ActionEntity;
  intent: ActionIntent;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
};

type FileSummary = {
  filename?: string | null;
  file_type?: string | null;
  tags?: string[] | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren", staggerChildren: 0.1 },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const bubbleVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// Custom markdown components
const markdownComponents = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h1: ({ children, ...props }: any) => (
    <h1
      className="text-2xl font-bold my-4 border-b-2 border-gray-200 pb-2"
      {...props}
    >
      {children}
    </h1>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h2: ({ children, ...props }: any) => (
    <h2
      className="text-xl font-bold my-3 border-b border-gray-200 pb-1"
      {...props}
    >
      {children}
    </h2>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h3: ({ children, ...props }: any) => (
    <h3 className="text-lg font-bold my-3" {...props}>
      {children}
    </h3>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h4: ({ children, ...props }: any) => (
    <h4 className="text-base font-bold my-2" {...props}>
      {children}
    </h4>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h5: ({ children, ...props }: any) => (
    <h5 className="text-sm font-bold my-2" {...props}>
      {children}
    </h5>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  h6: ({ children, ...props }: any) => (
    <h6 className="text-xs font-bold my-2" {...props}>
      {children}
    </h6>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  p: ({ children, ...props }: any) => (
    <p className="mb-3 leading-relaxed" {...props}>
      {children}
    </p>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockquote: ({ children, ...props }: any) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-4 italic text-gray-700 my-3"
      {...props}
    >
      {children}
    </blockquote>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  hr: ({ ...props }: any) => (
    <hr className="border-t border-gray-300 my-3" {...props} />
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code: ({ inline, children, ...props }: any) => {
    if (inline) {
      return (
        <code
          className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre
        className="bg-gray-100 text-gray-800 p-2 rounded text-sm font-mono overflow-x-auto my-3"
        {...props}
      >
        <code>{children}</code>
      </pre>
    );
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-3">
      <table
        className="min-w-full border-collapse border border-gray-300 text-sm"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  thead: ({ children, ...props }: any) => (
    <thead className="bg-gray-100 border-b border-gray-300" {...props}>
      {children}
    </thead>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tbody: ({ children, ...props }: any) => <tbody {...props}>{children}</tbody>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tr: ({ children, ...props }: any) => (
    <tr className="border-b last:border-0" {...props}>
      {children}
    </tr>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  th: ({ children, ...props }: any) => (
    <th
      className="border border-gray-300 px-3 py-2 font-semibold text-left"
      {...props}
    >
      {children}
    </th>
  ),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  td: ({ children, ...props }: any) => (
    <td className="border border-gray-300 px-3 py-2 align-top" {...props}>
      {children}
    </td>
  ),
};

// ClientOnly
const ClientOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return <>{children}</>;
};

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ActionPayload | null>(
    null,
  );
  const [applyingAction, setApplyingAction] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const hasSentMessageRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcastChannelRef = useRef<any>(null);

  const [latestMeds, setLatestMeds] = useState<
    Awaited<ReturnType<typeof getMedicationRemindersByUser>>
  >([]);
  const [latestAppts, setLatestAppts] = useState<
    Awaited<ReturnType<typeof getAppointmentRemindersByUser>>
  >([]);
  const [latestLogs, setLatestLogs] = useState<
    Awaited<ReturnType<typeof getHealthLogsByUser>>
  >([]);

  useEffect(() => {
    async function checkUserAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
      } else {
        setUserId(user.id);
      }
    }
    checkUserAuth();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const stored = localStorage.getItem(`symptomSyncChat-${userId}`);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {
        setMessages([]);
      }
    } else {
      setMessages([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    localStorage.setItem(`symptomSyncChat-${userId}`, JSON.stringify(messages));
    if (hasSentMessageRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, userId]);

  useEffect(() => {
    async function subscribeToUserChannel() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const userChannelName = `user-channel-${user.id}`;
      broadcastChannelRef.current = supabase.channel(userChannelName, {
        config: { broadcast: { self: false } },
      });
      const channel = broadcastChannelRef.current;

      channel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("broadcast", { event: "*" }, (payload: any) => {
          toast.success(
            `Notification: ${payload.payload.message.replace(/\./g, "")} from another device or tab.`,
          );
        })
        .subscribe((status: string) => {
          console.log("User-specific channel status:", status);
        });

      return () => {
        supabase.removeChannel(channel);
        broadcastChannelRef.current = null;
      };
    }

    subscribeToUserChannel();
  }, [router]);

  async function handleSend() {
    if (!userInput.trim() || loading) return;
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not logged in");

      // ✅ FIX HERE: fetchUserFiles returns { data, count }
      const [meds, appts, logs, profile, filesRes] = await Promise.all([
        getMedicationRemindersByUser(user.id),
        getAppointmentRemindersByUser(user.id),
        getHealthLogsByUser(user.id),
        getCurrentProfile(),
        fetchUserFiles(user.id, 1),
      ]);

      const files = filesRes?.data ?? [];

      setLatestMeds(meds);
      setLatestAppts(appts);
      setLatestLogs(logs);

      let userDataSummary = `Appointments:\n`;
      if (appts.length === 0) {
        userDataSummary += `- None\n`;
      } else {
        appts.forEach((a) => {
          const dateString = new Date(a.date).toLocaleString();
          userDataSummary += `- ${a.appointment_name} on ${dateString}\n`;
        });
      }

      userDataSummary += `\nMedications:\n`;
      if (meds.length === 0) {
        userDataSummary += `- None\n`;
      } else {
        meds.forEach((m) => {
          userDataSummary += `- ${m.medication_name}, dosage: ${
            m.dosage ?? "N/A"
          }, next time: ${new Date(m.reminder_time).toLocaleString()}, recurrence: ${
            m.recurrence ?? "N/A"
          }\n`;
        });
      }

      userDataSummary += `\nRecent Health Logs:\n`;
      if (logs.length === 0) {
        userDataSummary += `- None\n`;
      } else {
        const recent = logs.slice(-3);
        recent.forEach((l) => {
          userDataSummary += `- Symptom: ${l.symptom_type ?? "N/A"}, severity: ${
            l.severity ?? 0
          }, start: ${new Date(l.start_date).toLocaleString()}\n`;
        });
      }

      userDataSummary += `\nProfile:\n`;
      if (profile) {
        userDataSummary += `- Name: ${profile.full_name ?? "N/A"}\n`;
        userDataSummary += `- Conditions: ${
          profile.condition_tags?.join(", ") || "None"
        }\n`;
      } else {
        userDataSummary += `- No profile found.\n`;
      }

      // ✅ FIX HERE: files is already an array
      const docSummaries = (files as FileSummary[]).slice(0, 5);
      userDataSummary += `\nRecent Documents:\n`;
      if (docSummaries.length === 0) {
        userDataSummary += `- None\n`;
      } else {
        docSummaries.forEach((f) => {
          const filename = f.filename ?? "unknown";
          const fileType = f.file_type ?? "unknown";
          const tags =
            Array.isArray(f.tags) && f.tags.length > 0
              ? f.tags.join(", ")
              : "no tags";
          userDataSummary += `- ${filename} (${fileType}, ${tags})\n`;
        });
      }

      const newUserMessage: ChatMessage = { role: "user", text: userInput };
      const updatedMessages = [...messages, newUserMessage];
      setMessages(updatedMessages);
      hasSentMessageRef.current = true;

      const newHistory = updatedMessages.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const aiResponse = await chatWithHealthAI(
        newHistory,
        userInput,
        undefined,
        userDataSummary,
      );

      setAiError(null);

      setMessages((prev) => [...prev, { role: "model", text: aiResponse }]);
      setUserInput("");
    } catch (err) {
      console.error(err);
      let friendly = "AI is unavailable. Please try again soon.";
      if (err instanceof Error) {
        if (err.message.includes("429")) {
          friendly =
            "AI hit a rate limit. Please retry in a few seconds or check quota.";
        } else {
          friendly = err.message;
        }
      }
      setAiError(friendly);
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  }

  const handleClear = () => {
    setMessages([]);
    if (userId) {
      localStorage.removeItem(`symptomSyncChat-${userId}`);
    }
    hasSentMessageRef.current = false;
  };

  const AnimatedDots: React.FC = () => {
    const [dots, setDots] = useState("");

    useEffect(() => {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length < 3 ? prev + "." : ""));
      }, 500);
      return () => clearInterval(interval);
    }, []);

    return <span>{dots}</span>;
  };

  useEffect(() => {
    if (messages.length > 0) {
      const timeout = setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "auto" });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [messages]);

  return (
    <>
      <Head>
        <title>SymptomSync | AI Chat</title>
        <meta name="description" content="Chat with SymptomSync Assistant" />
      </Head>

      <ClientOnly>
        <motion.div
          className="h-screen bg-background text-foreground p-4 sm:p-6 overflow-hidden"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <style jsx global>{`
            html {
              scroll-behavior: smooth;
            }

            html,
            body {
              overscroll-behavior: none;
            }
          `}</style>

          <div className="max-w-4xl mx-auto space-y-6 pt-2">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col md:flex-row justify-between items-center"
              >
                <motion.div variants={slideInLeft}>
                  <h1 className="text-3xl font-extrabold text-center md:text-left">
                    Your Health Assistant 👨‍⚕️
                  </h1>
                  <motion.p
                    variants={cardVariants}
                    className="text-foreground mt-2 text-center md:text-left"
                  >
                    Ask our AI anything about your health. It’s like having a
                    doctor in your pocket!
                  </motion.p>
                </motion.div>
              </motion.div>
            </div>

            {messages.length > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  className="flex items-center gap-2 hover:scale-102 transition-transform cursor-pointer"
                  onClick={handleClear}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Conversation
                </Button>
              </div>
            )}

            <motion.div variants={cardVariants} initial="hidden" animate="visible">
              <Card className="p-4 sm:p-6 flex flex-col h-[70vh] rounded-xl shadow-2xl">
                <div className="flex-1 overflow-y-auto mb-4">
                  {messages.length === 0 && !loading && (
                    <div className="text-center text-gray-500 my-8">
                      <p>Type something to begin!</p>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        variants={bubbleVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -10 }}
                        className={`mb-2 flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`
                            rounded-lg p-2 pb-0 shadow 
                            ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }
                            max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg
                            overflow-x-auto hover:shadow-lg transition-shadow duration-300
                          `}
                        >
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {loading && (
                    <motion.div
                      variants={bubbleVariants}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -10 }}
                      className="flex justify-start mb-2"
                    >
                      <div className="bg-muted text-muted-foreground p-2 rounded-lg max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg shadow overflow-x-auto flex items-center gap-2">
                        <Loader2 className="animate-spin w-5 h-5" />
                        <span>
                          Thinking
                          <AnimatedDots />
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <div ref={scrollRef} />
                </div>

                {aiError && (
                  <div className="mb-3">
                    <Card className="p-3 bg-destructive/10 border border-destructive/30 text-destructive">
                      <p className="text-sm font-semibold">AI issue</p>
                      <p className="text-sm">{aiError}</p>
                    </Card>
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message…"
                    className="flex-1"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading}
                    className="flex items-center gap-1 hover:scale-105 transition-transform cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </ClientOnly>
    </>
  );
}
