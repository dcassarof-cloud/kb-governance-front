import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { governanceTexts } from '@/governanceTexts';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(`${governanceTexts.notFound.logMessage}:`, location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{governanceTexts.notFound.title}</h1>
        <p className="mb-4 text-xl text-muted-foreground">{governanceTexts.notFound.description}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {governanceTexts.notFound.backHome}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
