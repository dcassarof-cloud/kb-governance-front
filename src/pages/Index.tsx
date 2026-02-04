import { governanceTexts } from '@/governanceTexts';

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">{governanceTexts.index.title}</h1>
        <p className="text-xl text-muted-foreground">{governanceTexts.index.description}</p>
      </div>
    </div>
  );
};

export default Index;
