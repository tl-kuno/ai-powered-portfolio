import React, { useEffect, useState } from 'react';
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

interface ChatSectionProps {
  showPortfolio: boolean;
  setShowPortfolio: (show: boolean) => void;
}

/**
 * Main chat section component with profile header and interactive chat interface.
 * Handles click-based transitions to portfolio section.
 */
const ChatSection = ({ showPortfolio, setShowPortfolio }: ChatSectionProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hey this is Taylor! Welcome to my site :)\n\nAsk me anything about my work experience or personal projects. Or, if you would prefer, click below to explore my portfolio.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const showPortfolioView = () => {
    setShowPortfolio(true);
  };

  const showChatView = () => {
    setShowPortfolio(false);
  };

  const sendMessageWithQuestion = async (question: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: question,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Add to command history (keep last 5)
    setCommandHistory(prev => {
      const newHistory = [question, ...prev].slice(0, 5);
      return newHistory;
    });

    setIsLoading(true);
    setTimeout(scrollToBottom, 100);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          history: messages.slice(1).map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text,
          })),
        }),
      });

      const data = await response.json();
      setIsLoading(false);

      // Stream the AI response
      streamText(data.response, fullText => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: fullText,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setTimeout(scrollToBottom, 100);
      });
    } catch {
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

  useEffect(() => {
    const handleQuestionClick = (event: CustomEvent) => {
      const question = event.detail.question;
      sendMessageWithQuestion(question);
      showChatView();
    };

    window.addEventListener(
      'questionClick',
      handleQuestionClick as EventListener
    );

    return () => {
      window.removeEventListener(
        'questionClick',
        handleQuestionClick as EventListener
      );
    };
  }, [messages]);

  const scrollToBottom = () => {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  };

  const streamText = (text: string, callback: (fullText: string) => void) => {
    // Remove question-buttons tags from streaming display
    const cleanText = text.replace(
      /<question-buttons>([^<]+)<\/question-buttons>/g,
      ''
    );

    setStreamingText('');
    let index = 0;
    const interval = setInterval(() => {
      if (index < cleanText.length) {
        setStreamingText(cleanText.slice(0, index + 1));
        index++;
        scrollToBottom();
      } else {
        clearInterval(interval);
        callback(text); // Still pass full text to callback for final rendering
        setStreamingText('');
      }
    }, 20);
  };

  const renderMessageWithButtons = (text: string) => {
    // Handle question buttons
    const questionButtonRegex =
      /<question-buttons>([^<]+)<\/question-buttons>/g;
    let processedText = text;
    const questionButtons: React.JSX.Element[] = [];

    let questionMatch: RegExpExecArray | null;
    while ((questionMatch = questionButtonRegex.exec(text)) !== null) {
      const questions = questionMatch![1]
        .split('|')
        .map(q => q.replace(/^\[|\]$/g, '').trim());

      const buttonElements = questions.map((question, index) => (
        <button
          key={`${questionMatch!.index}-${index}`}
          className='question-button'
          onClick={() => {
            const event = new CustomEvent('questionClick', {
              detail: { question },
            });
            window.dispatchEvent(event);
          }}
          style={{
            margin: '4px 8px 4px 0',
            padding: '8px 12px',
            backgroundColor: 'transparent',
            border: '1px solid var(--color-accent)',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          {question}
        </button>
      ));

      questionButtons.push(
        <div key={questionMatch.index}>{buttonElements}</div>
      );

      processedText = processedText.replace(questionMatch[0], '');
    }

    // Return object with content and buttons
    return {
      content: processedText,
      buttons: questionButtons,
    };
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

    // Add to command history (keep last 5)
    setCommandHistory(prev => {
      const newHistory = [inputValue, ...prev].slice(0, 5);
      return newHistory;
    });

    setInputValue('');
    setHistoryIndex(-1);
    setIsLoading(true);
    setTimeout(scrollToBottom, 100);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          history: messages.slice(1).map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text,
          })),
        }),
      });

      const data = await response.json();
      setIsLoading(false);

      // Stream the AI response
      streamText(data.response, fullText => {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: fullText,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setTimeout(scrollToBottom, 100);
      });
    } catch {
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
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  };

  return (
    <>
      <section
        className={`chat-section ${showPortfolio ? 'collapsed' : ''}`}
        style={{
          transform: showPortfolio ? 'scale(0.7)' : 'scale(1)',
          opacity: showPortfolio ? 0.3 : 1,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
        }}
      >
        <div className={`chat-container ${showPortfolio ? 'collapsed' : ''}`}>
          <div className='profile-section'>
            <div className='profile-header-inline'>
              <div className='headshot'>
                <img
                  src='/images/headshot_hat_small.jpg'
                  alt='Taylor Kuno'
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                    borderRadius: '50%',
                    border: '2px solid var(--color-accent)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  }}
                />
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
                    <span>/github</span>
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
                    <span>/linkedin</span>
                  </a>
                  <a href='mailto:taylor.l.kuno@gmail.com'>
                    <svg
                      className='icon'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                    >
                      <path d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' />
                    </svg>
                    <span>@gmail</span>
                  </a>
                </div>
              </div>
            </div>

            <div className={`chat-interface ${showPortfolio ? 'hidden' : ''}`}>
              <div className='chat-messages'>
                {messages.map(message => {
                  const { content, buttons } = renderMessageWithButtons(
                    message.text
                  );
                  return (
                    <div key={message.id}>
                      <div
                        className={`message ${message.isUser ? 'user' : 'ai'}`}
                      >
                        <div className='message-content'>{content}</div>
                      </div>
                      {buttons && buttons.length > 0 && (
                        <div
                          style={{
                            marginTop: '8px',
                            marginLeft: message.isUser ? 'auto' : '0',
                            marginRight: message.isUser ? '0' : 'auto',
                            maxWidth: '70%',
                          }}
                        >
                          {buttons}
                        </div>
                      )}
                    </div>
                  );
                })}
                {isLoading && (
                  <div className='message ai'>
                    <div className='message-content loading'>Thinking...</div>
                  </div>
                )}
                {streamingText && (
                  <div className='message ai'>
                    <div className='message-content'>
                      {renderMessageWithButtons(streamingText).content}
                      <span className='cursor'>|</span>
                    </div>
                  </div>
                )}
              </div>

              <div className='chat-input'>
                <input
                  type='text'
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyPress}
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
              <div
                style={{
                  textAlign: 'center',
                  margin: '4px auto 0',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  fontStyle: 'italic',
                }}
                className='disclaimer-text'
              >
                Responses are AI-generated based on Taylor's portfolio data
              </div>
            </div>
          </div>

          <div className='scroll-hint'>
            <p>
              <span onClick={showPortfolioView} className='scroll-text'>
                ↓ Click to explore my portfolio ↓
              </span>
            </p>
          </div>
        </div>
      </section>

      {showPortfolio && (
        <div className='collapsed-header'>
          <div className='collapsed-content'>
            <div className='collapsed-left'>
              <div className='collapsed-headshot'>
                <img
                  src='/images/headshot_hat_small.jpg'
                  alt='Taylor Kuno'
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                    borderRadius: '50%',
                    border: '2px solid var(--color-accent)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                />
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
            <button className='scroll-to-top' onClick={showChatView}>
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
