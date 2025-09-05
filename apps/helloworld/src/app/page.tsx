import Link from 'next/link'

export default function Home() {
  return (
    <main className="main">
      <div className="container">
        <h1 className="title">
          Hello World! 🌍
        </h1>
        <p className="description">
          Welcome to this Next.js application with ISR (Incremental Static Regeneration) demonstration.
        </p>
        
        <div className="grid">
          <Link href="/posts" className="card">
            <h2>Posts with ISR →</h2>
            <p>Explore pages that regenerate incrementally every 60 seconds</p>
          </Link>
          
          <Link href="/api/hello" className="card">
            <h2>API Route →</h2>
            <p>Test the API endpoint that returns current server time</p>
          </Link>
        </div>
      </div>
    </main>
  )
}
