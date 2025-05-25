import Link from "next/link";
import { ArrowRight, MessageSquare, Zap, Users, Brain } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-blue-500" />
            <span className="text-2xl font-bold text-white">ChainChat</span>
          </div>
          <Link
            href="/chat"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Try for Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Chain Multiple AI
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
              {" "}
              Agents
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Create powerful AI workflows by chaining multiple agents together.
            Build complex conversations, conditional logic, and intelligent
            automation.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors group"
          >
            Try for Free
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
              <div className="bg-blue-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Brain className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Multi-Agent Chains
              </h3>
              <p className="text-gray-300">
                Chain multiple AI agents together to create complex workflows
                and conversations that build upon each other's responses.
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
              <div className="bg-purple-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Conditional Logic
              </h3>
              <p className="text-gray-300">
                Add smart conditional logic to your agent chains. Agents can be
                skipped or triggered based on previous responses.
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8">
              <div className="bg-green-600/20 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Multiple Models
              </h3>
              <p className="text-gray-300">
                Use different AI models for different tasks. Mix and match
                GPT-4, Claude, and other models in the same conversation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Build Your First Agent Chain?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Start creating powerful AI workflows in minutes. No setup required.
          </p>
          <Link
            href="/chat"
            className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-all group"
          >
            Get Started Now
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}
