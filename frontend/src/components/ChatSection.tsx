import { useState, useEffect } from 'react';
import './ChatSection.css';

/**
 * Message interface for chat functionality
 */
interface Message {
  /** Unique message identifier */
  id: string;
  /** Message content */
  text: string;
  /** Whether message is from user (true) or AI (false) */
  isUser: boolean;
  /** When the message was created */
  timestamp: Date;
}

/**
 * Main chat section component with profile header and interactive chat interface.
 * Handles scroll-based animations and transitions to portfolio section.
 */
const ChatSection = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm Taylor's AI assistant. Ask me anything about her background, experience, or projects!",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    // Animation configuration
    const HEADER_COLLAPSE_TRIGGER = 80;
    const ANIMATION_MAX_SCROLL = 200;
    const PORTFOLIO_SCROLL_TARGET = 225;

    const handleScroll = () => {
      const scrollY = window.scrollY;

      // Calculate progress for visual effects
      const progress = Math.min(scrollY / ANIMATION_MAX_SCROLL, 1);
      setScrollProgress(progress);

      // Toggle header visibility
      const shouldCollapse = scrollY >= HEADER_COLLAPSE_TRIGGER;
      if (shouldCollapse !== isCollapsed) {
        setIsCollapsed(shouldCollapse);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isCollapsed]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToPortfolio = () => {
    // Animation configuration
    const PORTFOLIO_SCROLL_TARGET = 225;

    // Scroll to position that puts Software Experience at top after animation
    window.scrollTo({ top: PORTFOLIO_SCROLL_TARGET, behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputValue }),
      });

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const createErrorMessage = (text: string): Message => ({
        id: (Date.now() + 1).toString(),
        text,
        isUser: false,
        timestamp: new Date(),
      });

      setMessages(prev => [
        ...prev,
        createErrorMessage('Sorry, I encountered an error. Please try again.'),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <section
        className={`chat-section ${isCollapsed ? 'collapsed' : ''}`}
        style={{
          transform: `scale(${1 - scrollProgress * 0.3})`,
          opacity: 1 - scrollProgress * 0.7,
        }}
      >
        <div className={`chat-container ${isCollapsed ? 'collapsed' : ''}`}>
          <div className='profile-section'>
            <div className='profile-header-inline'>
              <div className='headshot'>
                <div className='headshot-placeholder'>Photo</div>
              </div>
              <div className='name-and-links'>
                <h1>&lt;TaylorKuno /&gt;</h1>
                <div className='social-links'>
                  <a
                    href='https://github.com/tl-kuno'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <svg
                      className='icon'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                    >
                      <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                    </svg>
                    /github
                  </a>
                  <a
                    href='https://www.linkedin.com/in/taylorlkuno/'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    <svg
                      className='icon'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                    >
                      <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                    </svg>
                    /linkedin
                  </a>
                  <a href='mailto:taylor.l.kuno@gmail.com'>
                    <svg
                      className='icon'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                    >
                      <path d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' />
                    </svg>
                    @gmail
                  </a>
                </div>
              </div>
            </div>

            <div className={`chat-interface ${isCollapsed ? 'hidden' : ''}`}>
              <div className='chat-messages'>
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.isUser ? 'user' : 'ai'}`}
                  >
                    <div className='message-content'>{message.text}</div>
                  </div>
                ))}
                {isLoading && (
                  <div className='message ai'>
                    <div className='message-content loading'>Thinking...</div>
                  </div>
                )}
              </div>

              <div className='chat-input'>
                <input
                  type='text'
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder='Ask about my experience, projects, or anything else...'
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                >
                  <svg
                    width='20'
                    height='20'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                  >
                    <path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className='scroll-hint'>
            <p>
              <span onClick={scrollToPortfolio} className='scroll-text'>
                ↓ Scroll down to explore my portfolio ↓
              </span>
            </p>
          </div>
        </div>
      </section>

      {isCollapsed && (
        <div className='collapsed-header'>
          <div className='collapsed-content'>
            <div className='collapsed-left'>
              <div className='collapsed-headshot'>
                <div className='headshot-placeholder'>TK</div>
              </div>
              <h1>&lt;TK /&gt;</h1>
              <div className='collapsed-social-links'>
                <a
                  href='https://github.com/tl-kuno'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <svg className='icon' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
                  </svg>
                </a>
                <a
                  href='https://www.linkedin.com/in/taylorlkuno/'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <svg className='icon' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' />
                  </svg>
                </a>
                <a href='mailto:taylor.l.kuno@gmail.com'>
                  <svg className='icon' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' />
                  </svg>
                </a>
              </div>
            </div>
            <button className='scroll-to-top' onClick={scrollToTop}>
              <svg className='icon' viewBox='0 0 24 24' fill='currentColor'>
                <path d='M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z' />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatSection;
