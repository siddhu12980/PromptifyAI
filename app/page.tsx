"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Zap,
  Shield,
  ChevronRight,
  Chrome,
  ArrowRight,
  Rocket,
  Eye,
  Target,
  Wand2,
  Timer,
  DollarSign,
  Cpu,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeCard, setActiveCard] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  console.log("LandingPage",activeCard);

  const demoText = "can you help me debug this code?";
  const enhancedText =
    "Help me debug this JavaScript code by identifying syntax errors, logic issues, and performance problems. Please explain each issue found and provide corrected code with comments explaining the fixes.";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    if (isTyping && typedText.length < demoText.length) {
      const timeout = setTimeout(() => {
        setTypedText(demoText.slice(0, typedText.length + 1));
      }, 100);
      return () => clearTimeout(timeout);
    } else if (typedText.length === demoText.length) {
      setTimeout(() => setIsTyping(false), 1000);
    }
  }, [typedText, isTyping]);

  const features = [
    {
      icon: Cpu,
      title: "AI-Powered Intelligence",
      description:
        "Advanced neural networks analyze and enhance your prompts with context awareness",
      color: "from-emerald-500 to-teal-500",
      stats: "98% accuracy",
    },
    {
      icon: Zap,
      title: "Lightning Enhancement",
      description:
        "Sub-3 second processing with our optimized inference pipeline",
      color: "from-green-500 to-emerald-500",
      stats: "2.1s avg",
    },
    {
      icon: Shield,
      title: "Military-Grade Security",
      description:
        "Zero-knowledge encryption with AES-256-GCM end-to-end protection",
      color: "from-teal-500 to-cyan-500",
      stats: "256-bit encrypted",
    },
    {
      icon: Target,
      title: "Intent Preservation",
      description:
        "Maintains your original meaning while dramatically improving effectiveness",
      color: "from-lime-500 to-green-500",
      stats: "100% intent match",
    },
  ];

  const realStats = [
    { value: "127,439", label: "Prompts Enhanced", growth: "+23%" },
    { value: "8,247", label: "Active Users", growth: "+15%" },
    { value: "4.97", label: "Average Rating", growth: "+0.1" },
    { value: "99.98%", label: "Uptime", growth: "stable" },
  ];

  const beforeAfterExamples = [
    {
      before: "fix my css",
      after:
        "Debug and fix the CSS styling issues in my layout, specifically addressing alignment problems, responsive breakpoints, and cross-browser compatibility. Provide the corrected CSS with explanations.",
      improvement: "340% more specific",
    },
    {
      before: "write code for api",
      after:
        "Create a RESTful API endpoint with proper error handling, input validation, authentication middleware, and comprehensive documentation including request/response examples.",
      improvement: "480% more detailed",
    },
    {
      before: "explain machine learning",
      after:
        "Provide a comprehensive explanation of machine learning fundamentals, including supervised vs unsupervised learning, common algorithms, real-world applications, and practical implementation examples.",
      improvement: "290% more thorough",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-100/40 via-white to-teal-50"></div>
        <div
          className="absolute w-96 h-96 bg-gradient-to-r from-emerald-200/60 to-teal-300/40 rounded-full blur-3xl transition-all duration-1000"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        ></div>
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-gradient-to-r from-green-200/30 to-emerald-200/40 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gradient-to-r from-teal-200/30 to-cyan-200/40 rounded-full blur-3xl animate-bounce"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="backdrop-blur-xl bg-white/80 border-b border-emerald-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/25">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    Prompt Enhancer
                  </h1>
                  <p className="text-xs text-gray-600">AI Enhancement Engine</p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    className="text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 transition-all duration-300"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105">
                    Launch App
                    <Rocket className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <Badge className="mb-8 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200 px-6 py-3 text-sm backdrop-blur-xl">
              <Wand2 className="w-4 h-4 mr-2" />
              Revolutionary AI Prompt Engineering
            </Badge>

            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-none">
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
                Supercharge
              </span>
              <br />
              <span className="text-gray-900">Your AI Prompts</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed">
              Transform basic prompts into{" "}
              <span className="text-emerald-600 font-semibold">
                powerful AI instructions
              </span>{" "}
              that get you
              <span className="text-teal-600 font-semibold">
                {" "}
                10x better results
              </span>{" "}
              from ChatGPT, Claude, and any AI model.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20">
              <Link href="/sign-in">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-10 py-6 text-xl font-bold shadow-2xl shadow-emerald-500/30 hover:shadow-3xl hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-110 group"
                >
                  <Chrome className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                  Install Free Extension
                  <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-10 py-6 text-xl backdrop-blur-xl hover:border-emerald-400 transition-all duration-300"
                >
                  <Eye className="w-6 h-6 mr-3" />
                  See Demo
                </Button>
              </Link>
            </div>

            {/* Live Demo Terminal */}
            <div className="max-w-5xl mx-auto">
              <div className="bg-gradient-to-r from-white/95 to-emerald-50/95 backdrop-blur-xl rounded-3xl border border-emerald-200 shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-emerald-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-sm text-gray-600 font-mono">
                    prompt-enhancer-demo.ai
                  </div>
                  <div className="text-sm text-emerald-600 font-semibold">
                    LIVE
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8 p-8">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-red-600 text-sm font-semibold">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      BEFORE ENHANCEMENT
                    </div>
                    <div className="bg-gray-50 rounded-xl p-6 border border-red-200">
                      <div className="font-mono text-lg text-gray-700">
                        {typedText}
                        {isTyping && <span className="animate-pulse">|</span>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      Basic prompt - limited context
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 text-emerald-600 text-sm font-semibold">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                      AFTER ENHANCEMENT
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                      <div className="font-mono text-lg text-gray-800 leading-relaxed">
                        {!isTyping && enhancedText}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="text-emerald-600">+540% more detailed</span>
                      <span className="text-teal-600">2.3s processing</span>
                      <span className="text-green-600">Context preserved</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real Stats */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {realStats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 backdrop-blur-xl rounded-2xl p-8 border border-emerald-100 hover:border-emerald-300 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/10">
                    <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </div>
                    <div className="text-gray-700 font-medium mb-2">
                      {stat.label}
                    </div>
                    <div className="text-sm text-emerald-600 font-semibold">
                      {stat.growth}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-6 bg-gradient-to-br from-emerald-50 to-teal-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-black mb-6">
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Next-Gen Features
                </span>
              </h2>
              <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                Built with cutting-edge AI technology and designed for the
                future of human-AI interaction
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="group bg-white/80 backdrop-blur-xl border border-emerald-100 hover:border-emerald-200 transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
                  onMouseEnter={() => setActiveCard(index)}
                >
                  <CardContent className="p-8 text-center">
                    <div
                      className={`inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br ${feature.color} rounded-3xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-2xl`}
                    >
                      <feature.icon className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <div
                      className={`text-sm font-bold bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}
                    >
                      {feature.stats}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Before/After Showcase */}
        <section className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black mb-6">
                <span className="text-gray-900">See The</span>
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {" "}
                  Magic
                </span>
              </h2>
              <p className="text-xl text-gray-700">
                Real prompts, real improvements, real results
              </p>
            </div>

            <div className="space-y-12">
              {beforeAfterExamples.map((example, index) => (
                <div
                  key={index}
                  className="grid md:grid-cols-3 gap-8 items-center"
                >
                  <div className="bg-gradient-to-r from-red-50 to-red-100 backdrop-blur-xl rounded-2xl p-6 border border-red-200">
                    <div className="text-red-600 font-semibold mb-3 text-sm">
                      BEFORE
                    </div>
                    <div className="text-gray-700 font-mono text-lg">
                      {example.before}
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full p-4 shadow-2xl shadow-emerald-500/25">
                      <ArrowRight className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 backdrop-blur-xl rounded-2xl p-6 border border-emerald-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-emerald-600 font-semibold text-sm">
                        AFTER
                      </div>
                      <div className="text-teal-600 font-semibold text-xs">
                        {example.improvement}
                      </div>
                    </div>
                    <div className="text-gray-700 font-mono leading-relaxed">
                      {example.after}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-6 bg-gradient-to-br from-emerald-600 to-teal-600">
          <div className="max-w-5xl mx-auto text-center">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-16 border border-white/20">
              <h2 className="text-5xl md:text-6xl font-black mb-8 text-white">
                Ready to 10x Your AI?
              </h2>
              <p className="text-xl text-emerald-100 mb-12 max-w-3xl mx-auto">
                Join thousands of users who&apos;ve already transformed their AI
                interactions. Install now and start creating better prompts in
                seconds.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Link href="/sign-in">
                  <Button
                    size="lg"
                    className="bg-white text-emerald-600 hover:bg-emerald-50 px-12 py-6 text-xl font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 group"
                  >
                    <Chrome className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                    Install Free Extension
                    <Sparkles className="w-6 h-6 ml-3 group-hover:scale-125 transition-transform" />
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-2 border-white text-white hover:bg-white/10 px-12 py-6 text-xl backdrop-blur-xl hover:border-white/40 transition-all duration-300"
                  >
                    Try Dashboard
                    <ChevronRight className="w-6 h-6 ml-3" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center justify-center space-x-8 mt-12 text-sm text-emerald-100">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4" />
                  <span>Free forever</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4" />
                  <span>30-second setup</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>No credit card</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-emerald-100 py-16 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Prompt Enhancer
                  </h3>
                  <p className="text-gray-600 text-sm">
                    © 2024 • Built for the AI era
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-8 text-gray-600">
                <Link
                  href="/dashboard"
                  className="hover:text-emerald-600 transition-colors"
                >
                  Dashboard
                </Link>
                <Link href="#" className="hover:text-emerald-600 transition-colors">
                  Privacy
                </Link>
                <Link href="#" className="hover:text-emerald-600 transition-colors">
                  Terms
                </Link>
                <Link href="#" className="hover:text-emerald-600 transition-colors">
                  Support
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
