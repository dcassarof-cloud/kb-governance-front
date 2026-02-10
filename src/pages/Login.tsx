import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService } from '@/services/auth.service';
import { toast } from '@/hooks/use-toast';
import { governanceTexts } from '@/governanceTexts';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await authService.login(email, password);
    
    if (result.success) {
      toast({ title: governanceTexts.login.success });
      navigate('/dashboard');
    } else {
      toast({ title: governanceTexts.login.errorTitle, description: result.message, variant: 'destructive' });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <div className="text-center mb-8">
            <img
              src="/consisa-logo.png"
              alt={governanceTexts.login.logoAlt}
              className="h-12 w-auto mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold">{governanceTexts.login.title}</h1>
            <p className="text-muted-foreground mt-2">{governanceTexts.login.subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{governanceTexts.login.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={governanceTexts.login.emailPlaceholder}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{governanceTexts.login.passwordLabel}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={governanceTexts.login.passwordPlaceholder}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? governanceTexts.login.submitting : <><LogIn className="h-4 w-4 mr-2" /> {governanceTexts.login.submit}</>}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {governanceTexts.login.demo}
          </p>
        </div>
      </div>
    </div>
  );
}
