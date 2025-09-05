import Link from 'next/link'

// Mock data per i posts
const posts = [
  { id: '1', title: 'First Post', content: 'This is the content of the first post.' },
  { id: '2', title: 'Second Post', content: 'This is the content of the second post.' },
  { id: '3', title: 'Third Post', content: 'This is the content of the third post.' },
]

export default function PostsPage() {
  const currentTime = new Date().toISOString()

  return (
    <div className="container">
      <h1 className="title">Posts with ISR</h1>
      <p className="description">
        This page uses ISR (Incremental Static Regeneration) and will be regenerated every 60 seconds.
      </p>
      
      <div className="time">
        Generated at: {currentTime}
      </div>

      <div className="grid">
        {posts.map((post) => (
          <Link key={post.id} href={`/posts/${post.id}`} className="card">
            <h2>{post.title} →</h2>
            <p>{post.content}</p>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/" className="card">
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}

// ISR: questa pagina sarà rigenerata ogni 60 secondi
export const revalidate = 60
