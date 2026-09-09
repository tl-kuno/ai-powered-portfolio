import { useState } from 'react';
import ChatSection from './components/ChatSection';
import PortfolioSection from './components/PortfolioSection';
import './App.css';

function App() {
  const [showPortfolio, setShowPortfolio] = useState(false);

  return (
    <div className='app'>
      <ChatSection
        showPortfolio={showPortfolio}
        setShowPortfolio={setShowPortfolio}
      />
      {showPortfolio && <PortfolioSection />}
    </div>
  );
}

export default App;
