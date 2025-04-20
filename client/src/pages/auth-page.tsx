import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUserSchema } from "@shared/schema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = insertUserSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loginMutation, registerMutation } = useAuth();
  const [location, navigate] = useLocation();
  
  // Simple form state for direct testing
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // For login form - kept for compatibility
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // For registration form - kept for compatibility
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const onLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({
      username,
      password
    });
  };

  const onRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    registerMutation.mutate({
      username,
      password
    });
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Form Section */}
      <div className="flex-1 bg-white flex items-center justify-center">
        <div className="max-w-md w-full px-6 py-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">Imageshare</h1>
            <p className="text-muted-foreground mt-2">
              Share your memories with friends and groups
            </p>
          </div>

          {isLogin ? (
            // Simple Login Form
            <div className="space-y-4">
              <form onSubmit={onLoginSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-1">Username</label>
                    <input
                      id="username"
                      type="text"
                      className="w-full rounded-md border border-input px-3 py-2"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
                    <input
                      id="password"
                      type="password"
                      className="w-full rounded-md border border-input px-3 py-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            // Simple Register Form
            <div className="space-y-4">
              <form onSubmit={onRegisterSubmit}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="reg-username" className="block text-sm font-medium mb-1">Username</label>
                    <input
                      id="reg-username"
                      type="text"
                      className="w-full rounded-md border border-input px-3 py-2"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="reg-password" className="block text-sm font-medium mb-1">Password</label>
                    <input
                      id="reg-password"
                      type="password"
                      className="w-full rounded-md border border-input px-3 py-2"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">Confirm Password</label>
                    <input
                      id="confirm-password"
                      type="password"
                      className="w-full rounded-md border border-input px-3 py-2"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                    />
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Sign Up"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <Button
                variant="link"
                className="ml-1 p-0"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </Button>
            </p>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:block lg:flex-1 bg-primary relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-md p-6 text-white">
            <h2 className="text-3xl font-bold mb-4">Share your moments with the world</h2>
            <p className="text-primary-foreground mb-6">
              Upload, organize, and share your photos with friends and groups. Create memories that last forever.
            </p>

            {/* Image gallery preview */}
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square rounded-lg overflow-hidden bg-primary-800">
                <img
                  src="https://images.unsplash.com/photo-1506744038136-46273834b3fb"
                  alt="Landscape"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-lg overflow-hidden bg-primary-800">
                <img
                  src="https://images.unsplash.com/photo-1501854140801-50d01698950b"
                  alt="Nature"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-lg overflow-hidden bg-primary-800">
                <img
                  src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e"
                  alt="Forest"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
