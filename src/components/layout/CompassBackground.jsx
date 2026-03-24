import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Keeps the Compass AI conversation subscription alive in the background
// so responses are received even when the user navigates away from the Compass page.
export default function CompassBackground() {
  useEffect(() => {
    let unsubscribe = null;

    function subscribe() {
      const conversationId = sessionStorage.getItem('compass_conversation_id');
      if (!conversationId) return;

      try {
        unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
          sessionStorage.setItem('compass_messages', JSON.stringify(data.messages || []));
          // Dispatch a custom event so the Compass page can react if it's open
          window.dispatchEvent(new CustomEvent('compass_update', { detail: { messages: data.messages } }));
        });
      } catch (e) {
        // Conversation belongs to another user context (e.g., superadmin switched municipalities)
        // Clear stale conversation and let Compass page create a fresh one
        if (e?.message?.includes('Access denied') || e?.message?.includes('belongs to another user')) {
          sessionStorage.removeItem('compass_conversation_id');
          sessionStorage.removeItem('compass_messages');
        }
      }
    }

    subscribe();

    // Re-subscribe if a new conversation is started
    const handleStorage = (e) => {
      if (e.key === 'compass_conversation_id') {
        if (unsubscribe) unsubscribe();
        subscribe();
      }
    };

    window.addEventListener('storage', handleStorage);
    // Also listen for a custom event when Compass page creates a new conversation
    const handleNewConv = () => {
      if (unsubscribe) unsubscribe();
      subscribe();
    };
    window.addEventListener('compass_new_conversation', handleNewConv);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('compass_new_conversation', handleNewConv);
    };
  }, []);

  return null;
}