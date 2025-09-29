import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import SearchComponent from "../components/SearchComponent";
import styles from "./index.module.css";
import "../css/button-override.css";

const topicCards = [
  {
    description: "Your first steps into the PagoPA Developer Experience",
    icon: "🚀",
    items: ["Quick Start Guide", "Project Setup", "Best Practices"],
    link: "/docs/",
    title: "Getting Started with DX",
  },
  {
    description: "Learn Git workflows and collaboration patterns",
    icon: "🤝",
    items: ["Git Workflows", "Pull Requests", "Code Reviews"],
    link: "/docs/github",
    title: "Collaborating on GitHub",
  },
  {
    description: "TypeScript generators and development tools",
    icon: "⚙️",
    items: ["TypeScript Generators", "Project Templates", "Code Quality"],
    link: "/docs/",
    title: "Building with TypeScript",
  },
  {
    description: "Infrastructure as Code with Terraform modules",
    icon: "🏗️",
    items: ["Azure Modules", "AWS Modules", "Best Practices"],
    link: "/docs/terraform",
    title: "Working with Terraform",
  },
  {
    description: "Azure development patterns and tools",
    icon: "☁️",
    items: ["Azure Services", "Authentication", "Monitoring"],
    link: "/docs/azure/",
    title: "Developing on Azure",
  },
  {
    description: "Container development and deployment",
    icon: "🐳",
    items: ["Docker Images", "Registry", "CI/CD Pipelines"],
    link: "/docs/containers",
    title: "Working with Containers",
  },
];

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      description="Getting Started with PagoPA DX - Accelerate your development with proven tools and patterns"
      title={`${siteConfig.title}`}
    >
      <HomepageHeader />
      <main>
        <TopicsSection />
        <DiscoverableSection />
      </main>
    </Layout>
  );
}

function DiscoverableSection() {
  return (
    <section className={styles.discoverableSection}>
      <div className="container">
        <div className={styles.discoverableContent}>
          <div className={styles.discoverableText}>
            <h2 className={styles.discoverableTitle}>What's missing?</h2>
            <h3 className={styles.discoverableSubtitle}>
              Discoverable: engineers can find out it already exists
            </h3>
            <p className={styles.discoverableDescription}>
              Our tools and documentation are designed to be easily
              discoverable. If you can't find what you're looking for, let us
              know and we'll help you find it or build it together.
            </p>
            <Link
              className={`button button--primary ${styles.contributeButton}`}
              to="https://github.com/pagopa/dx/issues"
            >
              Suggest an Improvement
            </Link>
          </div>
          <div className={styles.discoverableVisual}>
            <div className={styles.discoverableCard}>
              <h4>Built for Developers</h4>
              <p>By developers, for developers</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomepageHeader() {
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Getting Started with PagoPA DX</h1>
            <p className={styles.heroSubtitle}>
              Accelerate your development journey with proven tools, patterns,
              and best practices for building scalable applications.
            </p>
            <div className={styles.heroButtons}>
              <Link
                className={`button button--primary button--lg ${styles.heroButton}`}
                to="/docs/"
              >
                Get Started
              </Link>
              <Link
                className={`button button--secondary button--lg ${styles.heroButton} ${styles.heroButtonWithIcon}`}
                to="/blog"
              >
                Stay up to date!
              </Link>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <img
              alt="Hero Illustration"
              height={300}
              src="/img/dx.png"
              width={400}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function TopicCard({ description, icon, items, link, title }) {
  return (
    <div className={styles.topicCard}>
      <Link className={styles.topicCardLink} to={link}>
        <div className={styles.topicCardHeader}>
          <span className={styles.topicIcon}>{icon}</span>
          <h3 className={styles.topicTitle}>{title}</h3>
        </div>
        <p className={styles.topicDescription}>{description}</p>
        <ul className={styles.topicItems}>
          {items.map((item, index) => (
            <li className={styles.topicItem} key={index}>
              {item}
            </li>
          ))}
        </ul>
        <div className={styles.topicCardFooter}>
          <span className={styles.exploreText}>Explore →</span>
        </div>
      </Link>
    </div>
  );
}

function TopicsSection() {
  return (
    <section className={styles.topicsSection}>
      <div className="container">
        <div className={styles.topicsHeader}>
          {/* <h2 className={styles.sectionTitle}>Tech Topics</h2> */}
          <h2 className={styles.sectionSubtitle}>
            Start your journey here and explore one of the topics below
          </h2>
        </div>
        <SearchComponent className={styles.topicsSearch} />
        <div className={styles.topicsGrid}>
          {topicCards.map((topic, index) => (
            <TopicCard key={index} {...topic} />
          ))}
        </div>
      </div>
    </section>
  );
}
