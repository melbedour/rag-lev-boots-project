export type ConversationTurn = {
  user: string;
  assistant: string;
};

class ConversationStore {
  private store = new Map<string, ConversationTurn[]>();
  private readonly maxRounds = 10; // keep last 10 rounds

  getHistory(conversationId: string): ConversationTurn[] {
    return this.store.get(conversationId) ?? [];
  }

  addTurn(conversationId: string, user: string, assistant: string): void {
    const history = this.store.get(conversationId) ?? [];
    history.push({ user, assistant });
    // Trim to last N rounds
    const start = Math.max(0, history.length - this.maxRounds);
    const trimmed = history.slice(start);
    this.store.set(conversationId, trimmed);
  }

  clear(conversationId: string): void {
    this.store.delete(conversationId);
  }
}

export const Conversations = new ConversationStore();

