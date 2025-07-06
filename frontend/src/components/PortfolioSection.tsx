import ExperienceCard from './ExperienceCard';
import './PortfolioSection.css';

// Portfolio data - moved outside component to avoid recreation on each render
const SOFTWARE_EXPERIENCE = [
  {
    title: 'Software Developer - MobileTouch Team',
    subtitle: 'Sansio • 2023-Present',
    description:
      'Build electronic medical record software for EMTs and first responders using React, TypeScript, and Next.js. Led special project implementing new styling system for Apple Store submission with zero rejections. Currently help spearhead company-wide AI tool adoption initiative across development teams.',
    questions: [
      "What's it like building software for EMTs in high-stress situations?",
      'Tell me about the Apple Store submission project',
      'How are you leading AI adoption at your company?',
      'What technologies do you work with daily?',
    ],
  },
  {
    title: 'Software Development Intern - HealthEMS',
    subtitle: 'Sansio • 2022-2023',
    description:
      'Migrated legacy framework to JavaScript and React for web admin platform managing MobileTouch configurations. Applied self-taught React skills to secure and excel in this role, demonstrating rapid learning ability and initiative in adopting key technologies.',
    questions: [
      'How did you teach yourself React for this internship?',
      'What was it like transitioning from Python to JavaScript?',
      'Tell me about working on legacy code migration',
      'How did this internship shape your career path?',
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
      'How does your healthcare background influence your software work?',
      'What was it like working with patients in crisis situations?',
      'Tell me about your first programming experience with Excel',
      'How do you build trust quickly with people under stress?',
    ],
  },
  {
    title: 'Epic EMR Training Coordinator',
    subtitle: 'Essentia Health • 2019',
    description:
      'Coordinated system-wide Epic EMR optimization training across all outpatient specialty clinics. Paired trainers with providers based on manager input and observed diverse user adoption challenges, learning change management strategies directly applicable to current AI tool adoption work.',
    questions: [
      'What did you learn about technology adoption from this role?',
      'How does this experience inform your AI tool implementation?',
      'What were the biggest challenges in training medical professionals?',
      'How do you handle resistance to new technology?',
    ],
  },
  {
    title: 'Senior Mental Health Practitioner',
    subtitle: 'Woodland Hills • 2017-2018',
    description:
      'Provided crisis intervention and mentoring for youth ages 12-18 in residential placement. Developed expertise in de-escalation, team coordination under pressure, and real-time documentation in high-stress situations.',
    questions: [
      'How do crisis management skills apply to software development?',
      'What did you learn about documentation under pressure?',
      'Tell me about working with teams in high-stress situations',
      'How does this experience help you understand EMT workflows?',
    ],
  },
];

const PERSONAL_PROJECTS = [
  {
    title: 'AI-Powered Portfolio Assistant',
    subtitle: 'Personal Project • 2025',
    description:
      'This website itself - built using AI-first development workflows to demonstrate rapid learning and implementation. FastAPI backend with OpenAI integration, React frontend, all developed using agentic coding tools in one week.',
    questions: [
      'How did you build this website so quickly?',
      'What AI tools did you use for development?',
      'Tell me about your development process',
      'How does this demonstrate your AI capabilities?',
    ],
  },
  {
    title: 'North Shore VertiGals Website',
    subtitle: 'Volunteer Project • 2025',
    description:
      "Built community website from scratch using Next.js, TypeScript, and React for women's rock climbing organization. Replaced outdated WordPress site to better communicate group mission and support fundraising events.",
    questions: [
      'Why did you choose Next.js for this project?',
      'How do you balance technical work with community organizing?',
      'Tell me about the design and development process',
      'What impact has the website had on the organization?',
    ],
    link: 'https://www.northshorevertigals.org/',
  },
  {
    title: 'Picnic Quest Game',
    subtitle: 'University Project • 2023',
    description:
      'Text-based adventure game featuring Junimo the cat and Marni the dog collecting items for a neighborhood picnic. Built React frontend and Python backend with teammate, creating pixel art and implementing NES-style graphics.',
    questions: [
      'What inspired the concept and characters?',
      'How did you handle the full-stack development?',
      'Tell me about creating the pixel art and graphics',
      'What did you learn from this collaboration?',
    ],
  },
];

const VOLUNTEER_EXPERIENCE = [
  {
    title: 'President',
    subtitle: 'North Shore VertiGals • 2019-Present',
    description:
      "Lead women's rock climbing community organization serving 70+ members. Rebuilt post-COVID engagement through strategic event scaling, launched successful film festival fundraiser, and created sustainable volunteer operations model.",
    questions: [
      'How did you rebuild community engagement after COVID?',
      'Tell me about organizing the Nuts of Steel film festival',
      "What's your approach to sustainable volunteer leadership?",
      'How do you balance growing a community with volunteer capacity?',
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
      'How do your creative pursuits influence your approach to programming?',
      'Tell me about the 72-page zine you designed',
      "What's your songwriting and music collaboration process?",
      'How does agate hunting on Lake Superior inspire your work?',
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
      'Why did you choose to self-teach React alongside your Python coursework?',
      'How did you balance full-time work with finishing your degree?',
      'Tell me about your capstone project experience',
      'What was the most valuable part of your CS education?',
    ],
  },
  {
    title: 'Bachelor of Arts, Chemistry',
    subtitle: 'University of Minnesota Duluth',
    description:
      'Focused on Organic Chemistry and Biochemistry with special interest in Neuropsychopharmacology. Strong analytical foundation in complex systems thinking, research methodologies, and scientific problem-solving that directly informs my approach to software development.',
    questions: [
      'How does your chemistry background influence your programming approach?',
      'Tell me about your interest in neuropsychopharmacology',
      'What connections do you see between chemistry and software development?',
      'How did your chemistry degree prepare you for your healthcare technology work?',
    ],
  },
];

/**
 * Portfolio section component displaying organized experience categories.
 * Contains software experience, healthcare background, projects, and education.
 */
const PortfolioSection = () => {
  return (
    <section className='portfolio-section'>
      <div className='portfolio-container'>
        <div className='portfolio-header'>
          <h2 style={{ visibility: 'hidden' }}>My Portfolio</h2>
        </div>

        <div className='portfolio-content'>
          <div className='experience-section'>
            <h3 className='section-title'>Software Experience</h3>
            {SOFTWARE_EXPERIENCE.map((exp, index) => (
              <ExperienceCard key={index} {...exp} />
            ))}
          </div>

          <div className='experience-section'>
            <h3 className='section-title'>Healthcare Experience</h3>
            {HEALTHCARE_EXPERIENCE.map((exp, index) => (
              <ExperienceCard key={index} {...exp} />
            ))}
          </div>

          <div className='experience-section'>
            <h3 className='section-title'>Personal Projects</h3>
            {PERSONAL_PROJECTS.map((exp, index) => (
              <ExperienceCard key={index} {...exp} />
            ))}
          </div>

          <div className='experience-section'>
            <h3 className='section-title'>Volunteer Experience</h3>
            {VOLUNTEER_EXPERIENCE.map((exp, index) => (
              <ExperienceCard key={index} {...exp} />
            ))}
          </div>

          <div className='experience-section'>
            <h3 className='section-title'>Creative Projects</h3>
            {CREATIVE_PROJECTS.map((exp, index) => (
              <ExperienceCard key={index} {...exp} />
            ))}
          </div>

          <div className='experience-section'>
            <h3 className='section-title'>Education</h3>
            {EDUCATION.map((exp, index) => (
              <ExperienceCard key={index} {...exp} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
