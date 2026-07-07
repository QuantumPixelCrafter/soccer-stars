import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { setToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const mutation = activeTab === "login" ? loginMutation : registerMutation;
    
    mutation.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          setToken(data.token);
          toast({
            title: activeTab === "login" ? "Welcome back" : "Account created",
            description: `Logged in as ${data.username}`,
          });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Authentication failed",
            description: (error.data as { error?: string })?.error || "An unexpected error occurred",
          });
        },
      }
    );
  }

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 relative overflow-hidden bg-card border-r border-border">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-md relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 text-center"
          >
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold mb-6 shadow-[0_0_30px_rgba(255,170,0,0.3)]">
              FC
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">LATE NIGHT PACKS</h1>
            <p className="text-muted-foreground text-lg">Build your ultimate collection.</p>
          </motion.div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-background border border-border">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="manager123" 
                          {...field} 
                          className="bg-background/50 h-12 text-lg px-4 border-muted hover:border-border focus:border-primary transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="bg-background/50 h-12 text-lg px-4 border-muted hover:border-border focus:border-primary transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-bold uppercase tracking-wider relative overflow-hidden group" 
                  disabled={isPending}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                    {activeTab === "login" ? "Enter Stadium" : "Create Club"}
                  </span>
                  {!isPending && (
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  )}
                </Button>
              </form>
            </Form>
          </Tabs>
        </div>
      </div>
      <div className="hidden md:flex w-1/2 bg-[url('https://images.unsplash.com/photo-1518605368461-1ee7ce366050?q=80&w=2938&auto=format&fit=crop')] bg-cover bg-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <h2 className="text-5xl font-bold text-white mb-4 leading-tight">The thrill of the pull.</h2>
          <p className="text-xl text-white/70">Unpack legends. Build the perfect squad. Rule the pitch.</p>
        </div>
      </div>
    </div>
  );
}
