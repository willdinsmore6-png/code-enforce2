import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Keeps the Meridian (compass agent) conversation subscription alive in the background
// so responses are received even when the user navigates away from /compass.
export default function CompassBackground() {
  useEffect(() => {
    let unsubscribe = null;

    function subscribe() {
      const conversationId = sessionStorage.getItem('compass_conversation_id');
      if (!conversationId) return;

      try {
        unsubscribe = base44.agents.subscribeToConversation(conversationId, (data) => {
          sessionStorage.setItem('compass_messages', JSON.stringify(data.messages || []));
          // Dispatch a custom event so the Meridian page can react if it's open
          window.dispatchEvent(new CustomEvent('compass_update', { detail: { messages: data.messages } }));
        });
      } catch (error) {
        // Conversation expired or belongs to another user — clear it
        sessionStorage.removeItem('compass_conversation_id');
        sessionStorage.removeItem('compass_messages');
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
    // Also listen for a custom event when the Meridian page creates a new conversation
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