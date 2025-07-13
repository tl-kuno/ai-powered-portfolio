import { useState, useRef } from 'react';
import ExperienceCard from './ExperienceCard';
import './PortfolioSection.css';

// Portfolio data - moved outside component to avoid recreation on each render
const SOFTWARE_EXPERIENCE = [
  {
    title: 'Software Developer - MobileTouch Team',
    subtitle: 'Sansio • 2023-Present',
    description:
      'Build electronic medical record software for EMTs and first responders using React, TypeScript, and Next.js. Led special project implementing new styling system to meet Apple Store submission standards. Currently help to spearhead company-wide AI tool adoption initiative across development teams.',
    questions: [
      'What is it like building EMR software for EMTs?',
      'How are you helping lead AI tool adoption at Sansio?',
      'Tell me about the Apple Store UI overhaul project.',
    ],
  },
  {
    title: 'Software Development Intern - HealthEMS',
    subtitle: 'Sansio • 2022-2023',
    description:
      'Migrated legacy framework to JavaScript and React for web admin platform managing MobileTouch configurations. Applied self-taught React skills to secure and excel in this role, demonstrating rapid learning ability and initiative in adopting key technologies.',
    questions: [
      'What was it like migrating legacy framework code at Sansio?',
      'How did your Sansio internship validate your self-teaching approach to JavaScript and React?',
    ],
  },
];

const HEALTHCARE_EXPERIENCE = [
  {
    title: 'Psychometrist',
    subtitle: 'Essentia Health • 2018-2022',
    description:
      'Administered neuropsychological testing to patients ages 1-adult, requiring rapid rapport building and precise documentation under pressure. Created Excel automation tools for test scoring - the first programming experience that sparked my interest in software development.',
    questions: [
      'Tell me about creating Excel programs for neuropsychological test scoring at Essentia Health',
      'How do you build rapport quickly under pressure as a psychometrist?',
    ],
  },
  {
    title: 'Epic EMR Training Coordinator',
    subtitle: 'Essentia Health • 2019',
    description:
      'Coordinated system-wide Epic EMR optimization training across all outpatient specialty clinics. Paired trainers with providers based on manager input and observed diverse user adoption challenges, learning change management strategies directly applicable to current AI tool adoption work.',
    questions: [
      'How does your Epic EMR training experience at Essentia Health inform your AI adoption work?',
      'How do you help skeptical users trust new processes based on your Epic training experience?',
    ],
  },
  {
    title: 'Senior Mental Health Practitioner',
    subtitle: 'Woodland Hills • 2017-2018',
    description:
      'Provided crisis intervention and mentoring for youth ages 12-18 in residential placement. Developed expertise in de-escalation, team coordination under pressure, and real-time documentation in high-stress situations.',
    questions: [
      'What did you learn about crisis intervention while working at Woodland Hills?',
      'How does your Woodland Hills experience help you understand EMT workflows?',
    ],
  },
];

const PERSONAL_PROJECTS = [
  {
    title: 'AI-Powered Portfolio Assistant',
    subtitle: 'Personal Project • 2025',
    description:
      'This website itself - built using AI-first development workflows to demonstrate rapid learning and implementation. Serverless API with OpenAI integration, React frontend, all developed using agentic coding tools in one week.',
    questions: [
      'What was your agentic coding process like for building the portfolio?',
      'What did you accomplish on this portfolio with AI tools that you couldn’t have done otherwise?',
    ],
  },
  {
    title: 'North Shore VertiGals Website',
    subtitle: 'Volunteer Project • 2025',
    description:
      "Built community website from scratch using Next.js, TypeScript, and React for women's rock climbing organization. Replaced outdated WordPress site to better communicate group mission and support fundraising events.",
    questions: [
      'Why did you choose Next.js and TypeScript for the VertiGals website?',
      'How do you balance technical work on the VertiGals website with community leadership?',
    ],
    link: 'https://www.northshorevertigals.org/',
  },
  {
    title: 'Picnic Quest Game',
    subtitle: 'University Project • 2023',
    description:
      'Text-based adventure game featuring Junimo the cat and Marni the dog collecting items for a neighborhood picnic. Built React frontend and Python backend with teammate, creating pixel art and implementing NES-style graphics.',
    questions: [
      'Tell me about the characters Junimo and Marni in Picnic Quest',
      'What was it like collaborating on the full-stack Picnic Quest game?',
    ],
  },
];

const VOLUNTEER_EXPERIENCE = [
  {
    title: 'President',
    subtitle: 'North Shore VertiGals • 2022-Present (Board Member since 2019)',
    description:
      "Lead women's rock climbing community organization serving 70+ members. Rebuilt post-COVID engagement through strategic event scaling, launched successful film festival fundraiser, and created sustainable volunteer operations model.",
    questions: [
      'How did you rebuild VertiGals engagement after COVID?',
      'Tell me about the Nuts of Steel film festival for VertiGals',
    ],
  },
];

const CREATIVE_PROJECTS = [
  {
    title: 'Creative Pursuits & Artistic Expression',
    subtitle: 'Ongoing Personal Practice • Various Projects',
    description:
      'Diverse creative portfolio including 72-page zine design for independent skate film, graphic design for VertiGals merchandise line, original music composition spanning folk to metal genres, poetry from stream-of-consciousness writing, and jewelry making from Lake Superior agates. These creative practices inform my approach to UI/UX design and problem-solving.',
    questions: [
      'Tell me about designing the 72-page Dogshit Zine for the skate film',
      'What is your songwriting and music collaboration process like?',
    ],
    links: [
      {
        name: 'Read the Zine',
        url: 'https://mixam.com/share/655a94a4cacdf40e33c91c33',
      },
      {
        name: 'Check out the Merch',
        url: 'https://dspondemand.com/collections/north-shore-vertigals-merch',
      },
    ],
  },
];

const EDUCATION = [
  {
    title: 'Bachelor of Science, Computer Science',
    subtitle: 'Oregon State University • 2023',
    description:
      'Python-focused program with self-directed learning in JavaScript and React. Capstone project involved full-stack game development. Graduated while working full-time internship at Sansio.',
    questions: [
      'Why did you self-teach React alongside your Python coursework at Oregon State?',
      'How did you balance full-time work at Sansio with finishing your Oregon State degree?',
    ],
  },
  {
    title: 'Bachelor of Arts, Chemistry',
    subtitle: 'University of Minnesota Duluth',
    description:
      'Focused on Organic Chemistry and Biochemistry with special interest in Neuropsychopharmacology. Strong analytical foundation in complex systems thinking, research methodologies, and scientific problem-solving that directly informs my approach to software development.',
    questions: [
      'Tell me about your research on Toxoplasma gondii compounds at UMD',
      'What connections do you see between your chemistry education and software development?',
    ],
  },
];

const SECTIONS = [
  { title: 'Software Experience', data: SOFTWARE_EXPERIENCE },
  { title: 'Healthcare Experience', data: HEALTHCARE_EXPERIENCE },
  { title: 'Personal Projects', data: PERSONAL_PROJECTS },
  { title: 'Volunteer Experience', data: VOLUNTEER_EXPERIENCE },
  { title: 'Creative Projects', data: CREATIVE_PROJECTS },
  { title: 'Education', data: EDUCATION },
];

/**
 * Portfolio section component displaying organized experience categories in a carousel.
 * Contains software experience, healthcare background, projects, and education.
 */
const PortfolioSection = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const nextSection = () => {
    setCurrentSection(prev => (prev + 1) % SECTIONS.length);
  };

  const prevSection = () => {
    setCurrentSection(prev => (prev - 1 + SECTIONS.length) % SECTIONS.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;

    const endX = e.changedTouches[0].clientX;
    const diff = startX.current - endX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSection();
      } else {
        prevSection();
      }
    }

    isDragging.current = false;
  };

  return (
    <section className='portfolio-section'>
      <div className='portfolio-container'>
        <div className='carousel-header'>
          <div className='header-title-container'>
            <div
              className='header-title-track'
              style={{ transform: `translateX(-${currentSection * 100}%)` }}
            >
              {SECTIONS.map((section, index) => (
                <h3 key={index} className='header-title'>
                  {section.title}
                </h3>
              ))}
            </div>
          </div>
          <div className='nav-controls'>
            <button className='nav-arrow nav-arrow-left' onClick={prevSection}>
              &lt;
            </button>
            <button className='nav-arrow nav-arrow-right' onClick={nextSection}>
              &gt;
            </button>
          </div>
        </div>

        <div
          className='carousel-container'
          ref={carouselRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className='carousel-track'
            style={{ transform: `translateX(-${currentSection * 100}%)` }}
          >
            {SECTIONS.map((section, index) => (
              <div key={index} className='carousel-slide'>
                <div className='experience-section'>
                  {section.data.map((exp, expIndex) => (
                    <ExperienceCard key={expIndex} {...exp} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
