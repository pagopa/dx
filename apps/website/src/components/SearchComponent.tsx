import { useHistory } from "@docusaurus/router";
import React, { useEffect, useRef } from "react";

import styles from "./SearchComponent.module.css";

interface SearchComponentProps {
  className?: string;
  placeholder?: string;
}

export default function SearchComponent({
  className = "",
  placeholder = "Search documentation, guides, and resources...",
}: SearchComponentProps): JSX.Element {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const history = useHistory();

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchTerm = searchInputRef.current?.value.trim();

    if (searchTerm) {
      // Navigate to search results page with query parameter
      history.push(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const form = event.currentTarget.closest("form");
      if (form) {
        form.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        );
      }
    }
  };

  // Focus search input when user presses Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={`${styles.searchContainer} ${className}`}>
      <form className={styles.searchForm} onSubmit={handleSearch}>
        <div className={styles.searchInputWrapper}>
          <svg
            className={styles.searchIcon}
            fill="none"
            height="20"
            viewBox="0 0 24 24"
            width="20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <input
            aria-label="Search"
            className={styles.searchInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={searchInputRef}
            type="text"
          />
          <kbd className={styles.searchShortcut}>⌘K</kbd>
        </div>
        <button className={styles.searchButton} type="submit">
          Search
        </button>
      </form>
      <div className={styles.searchSuggestions}>
        <span className={styles.suggestionLabel}>Popular searches:</span>
        <button
          className={styles.suggestionTag}
          onClick={() => {
            if (searchInputRef.current) {
              searchInputRef.current.value = "Azure";
              searchInputRef.current.form?.dispatchEvent(
                new Event("submit", { bubbles: true, cancelable: true }),
              );
            }
          }}
        >
          Azure
        </button>
        <button
          className={styles.suggestionTag}
          onClick={() => {
            if (searchInputRef.current) {
              searchInputRef.current.value = "Terraform";
              searchInputRef.current.form?.dispatchEvent(
                new Event("submit", { bubbles: true, cancelable: true }),
              );
            }
          }}
        >
          Terraform
        </button>
        <button
          className={styles.suggestionTag}
          onClick={() => {
            if (searchInputRef.current) {
              searchInputRef.current.value = "TypeScript";
              searchInputRef.current.form?.dispatchEvent(
                new Event("submit", { bubbles: true, cancelable: true }),
              );
            }
          }}
        >
          TypeScript
        </button>
        <button
          className={styles.suggestionTag}
          onClick={() => {
            if (searchInputRef.current) {
              searchInputRef.current.value = "GitHub Actions";
              searchInputRef.current.form?.dispatchEvent(
                new Event("submit", { bubbles: true, cancelable: true }),
              );
            }
          }}
        >
          GitHub Actions
        </button>
      </div>
    </div>
  );
}
