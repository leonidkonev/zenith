import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-cosmic">
      <div className="glass max-w-md w-full p-10 rounded-2xl text-center animate-fade-in glow-soft">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-space-200 via-space-300 to-space-200 bg-clip-text text-transparent mb-3 tracking-tight">
          Zenith
        </h1>
        <p className="text-gray-400 mb-8 text-lg">A self-hosted space for your community</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-space-300 hover:bg-space-200 text-white font-medium transition-all duration-200 hover:scale-[1.02] glow-purple"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl glass-subtle hover:bg-space-600/70 text-gray-200 font-medium transition-all duration-200 border border-white/10 hover:border-white/20"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
