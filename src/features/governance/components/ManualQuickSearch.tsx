import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { governanceTexts } from '@/governanceTexts';
import { toast } from '@/hooks/use-toast';
import { articlesService } from '@/services/articles.service';
import type { KbArticle } from '@/types';

interface ManualQuickSearchProps {
  systemCode?: string;
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;

export function ManualQuickSearch({ systemCode }: ManualQuickSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KbArticle[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setLoading(false);
      setResults([]);
      return;
    }

    let cancelled = false;

    const fetchManuals = async () => {
      try {
        setLoading(true);
        const response = await articlesService.getArticles({
          q: debouncedQuery,
          size: 10,
          page: 1,
          systemCode,
        });
        if (!cancelled) {
          setResults(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setResults([]);
          const message = error instanceof Error ? error.message : 'Falha ao buscar manuais.';
          toast({
            title: governanceTexts.general.errorTitle,
            description: message,
            variant: 'destructive',
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchManuals();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, open, systemCode]);

  const helperText = useMemo(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) {
      return 'Digite pelo menos 2 letras';
    }
    if (loading) {
      return 'Buscando manuais...';
    }
    return null;
  }, [loading, query]);

  const handleSelect = (article: KbArticle) => {
    const link = article.manualLink;

    if (!link) {
      toast({
        title: governanceTexts.general.attentionTitle,
        description: 'Manual sem link disponível.',
      });
      return;
    }

    window.open(link, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="manual-quick-search">Pesquisar manual (atalho)</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="manual-quick-search"
              value={query}
              onChange={(event) => {
                if (!open) setOpen(true);
                setQuery(event.target.value);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Pesquisar manual (atalho)"
              className="pl-10"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandList>
              {helperText ? (
                <div className="px-3 py-4 text-sm text-muted-foreground flex items-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{helperText}</span>
                </div>
              ) : null}

              {!helperText ? (
                <>
                  <CommandEmpty>Nenhum manual encontrado.</CommandEmpty>
                  <CommandGroup heading="Resultados">
                    {results.map((article) => (
                      <CommandItem
                        key={article.id}
                        value={`${article.id}-${article.title}`}
                        onSelect={() => handleSelect(article)}
                      >
                        <div className="flex w-full flex-col">
                          <span className="font-medium">{article.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {article.systemCode || governanceTexts.general.notAvailable}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              ) : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
