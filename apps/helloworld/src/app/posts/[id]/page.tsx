import Link from 'next/link'
import { notFound } from 'next/navigation'

// Mock data per i posts
const posts = [
  { id: '1', title: 'First Post', content: 'This is the detailed content of the first post. Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
  { id: '2', title: 'Second Post', content: 'This is the detailed content of the second post. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' },
  { id: '3', title: 'Third Post', content: 'This is the detailed content of the third post. Ut enim ad minim veniam, quis nostrud exercitation ullamco.' },
]

export default function PostPage({ params }: { params: { id: string } }) {
  const post = posts.find(p => p.id === params.id)
  
  if (!post) {
    notFound()
  }

  const currentTime = new Date().toISOString()

  return (
    <div className="container">
      <h1 className="title">{post.title}</h1>
      
      <div className="time">
        Generated at: {currentTime}
      </div>

      <div className="card">
        <p>{post.content}</p>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/posts" className="card">
          ← Back to Posts
        </Link>
      </div>
    </div>
  )
}

// Generate static params per le pagine statiche
export async function generateStaticParams() {
  return posts.map((post) => ({
    id: post.id,
  }))
}

// ISR: questa pagina sarà rigenerata ogni 30 secondi
export const revalidate = 30
