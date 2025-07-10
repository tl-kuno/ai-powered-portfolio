import { useState } from 'react';
import './ExperienceCard.css';

/**
 * Props for the ExperienceCard component
 */
interface ExperienceCardProps {
  /** Card title (job title, project name, etc.) */
  title: string;
  /** Subtitle with company and date range */
  subtitle: string;
  /** Main description text */
  description: string;
  /** Array of suggested questions for AI chat */
  questions: string[];
  /** Optional image URL (currently unused) */
  imageUrl?: string;
  /** Single external link URL */
  link?: string;
  /** Multiple links with names and URLs for dropdown */
  links?: { name: string; url: string }[];
}

/**
 * Reusable card component for displaying experience, projects, and other portfolio items.
 * Supports both single external links and dropdown menus for multiple links.
 */
const ExperienceCard = ({
  title,
  subtitle,
  description,
  questions,
  link,
  links,
}: ExperienceCardProps) => {
  const [showDropdown, setShowDropdown] = useState(false);

  const EXTERNAL_LINK_ICON = (
    <svg width='24' height='24' viewBox='0 0 24 24' fill='currentColor'>
      <path d='M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z' />
    </svg>
  );

  const renderLinkSection = () => (
    <div className='link-container'>
      {links ? (
        <>
          <a
            className='card-link-icon'
            onClick={e => {
              e.preventDefault();
              setShowDropdown(!showDropdown);
            }}
            href='#'
          >
            {EXTERNAL_LINK_ICON}
          </a>
          {showDropdown && (
            <div className='link-dropdown'>
              {links.map((linkItem, index) => (
                <a
                  key={index}
                  href={linkItem.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='dropdown-link'
                  onClick={() => setShowDropdown(false)}
                >
                  {linkItem.name}
                </a>
              ))}
            </div>
          )}
        </>
      ) : (
        <a
          href={link}
          target='_blank'
          rel='noopener noreferrer'
          className='card-link-icon'
        >
          {EXTERNAL_LINK_ICON}
        </a>
      )}
    </div>
  );
  const handleQuestionClick = (question: string) => {
    // Dispatch custom event to ChatSection
    const event = new CustomEvent('questionClick', {
      detail: { question },
    });
    window.dispatchEvent(event);
  };

  return (
    <div className='experience-card'>
      <div className='card-content'>
        <div className='card-right'>
          <div className='card-header'>
            <h3 className='card-title'>{title}</h3>
            {(link || links) && renderLinkSection()}
          </div>
          <p className='card-subtitle'>{subtitle}</p>
          <p className='card-description'>{description}</p>

          <div className='suggested-questions'>
            <h4>Ask me about:</h4>
            <div className='questions-list'>
              {questions.map((question, index) => (
                <button
                  key={index}
                  className='question-button'
                  onClick={() => handleQuestionClick(question)}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperienceCard;
