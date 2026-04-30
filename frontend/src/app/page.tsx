import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit">
          <Link
            href="/login"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Get Started
          </Link>
        </p>
      </div>

      <div className="relative flex place-items-center before:absolute before:h-[300px] before:w-full sm:before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl after:absolute after:-z-20 after:h-[180px] after:w-full sm:after:w-[240px] after:translate-x-1/2 after:bg-gradient-to-r after:from-violet-600 after:to-pink-600 after:rounded-full after:blur-2xl before:dark:bg-gradient-to-br before:from-transparent before:to-neutral-700/10 after:dark:from-violet-900/20 after:dark:to-pink-900/20">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4">Pair Programming Platform</h1>
          <p className="text-lg text-gray-600 mb-8">
            Collaborative coding with AI-powered adaptive support
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-3">Real-time Collaboration</h2>
              <p className="text-gray-600">
                Work together with your partner using shared code editor and live communication
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-3">Adaptive Support</h2>
              <p className="text-gray-600">
                AI-powered interventions help when you get stuck or need guidance
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-3">Java Practice</h2>
              <p className="text-gray-600">
                Improve your Java skills with structured pair programming exercises
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-3">Performance Analytics</h2>
              <p className="text-gray-600">
                Track your progress and get personalized recommendations
              </p>
            </div>
            <Link href="/ml-sandbox" className="bg-white p-6 rounded-lg shadow-lg border-2 border-transparent hover:border-blue-500 transition cursor-pointer">
              <h2 className="text-xl font-semibold mb-3 text-blue-600">ML Sandbox 🧪</h2>
              <p className="text-gray-600">
                Test the XGBoost model predictions and RAG interventions manually
              </p>
            </Link>
            <Link href="/ml-analytics" className="bg-white p-6 rounded-lg shadow-lg border-2 border-transparent hover:border-indigo-500 transition cursor-pointer">
              <h2 className="text-xl font-semibold mb-3 text-indigo-600">ML Analytics 📊</h2>
              <p className="text-gray-600">
                View detailed timelines and historical prediction data from sessions
              </p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
