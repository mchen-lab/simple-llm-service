import { useState, useCallback } from 'react';
import { copyToClipboard } from '@/lib/utils';

/**
 * Hook for clipboard copy with visual feedback state
 * @param resetDelay - Time in ms before resetting copied state (default: 2000)
 * @returns [isCopied, copy] - State and copy function
 * 
 * @example
 * ```tsx
 * import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
 * import { Copy, Check } from 'lucide-react';
 * 
 * function CopyButton({ text }: { text: string }) {
 *   const [isCopied, copy] = useCopyToClipboard();
 *   
 *   return (
 *     <button onClick={() => copy(text)}>
 *       {isCopied ? <Check className="text-green-500" /> : <Copy />}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCopyToClipboard(resetDelay = 2000) {
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), resetDelay);
    }
    return success;
  }, [resetDelay]);

  return [isCopied, copy] as const;
}
