
const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is missing from .env.local");
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ?? `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function loginUser(
  credentials: LoginRequest,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}


export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  conversation_id: string;
  user_message: string;
  reply: string;
  history_messages: number;
}

export async function sendChatMessage(
  message: string,
  token: string,
  conversationId?: string,
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>("/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message,
      ...(conversationId ? { conversation_id: conversationId } : {}),
    }),
  });
}



export interface Conversation {
  id: string;
  title: string;
  user_id: string;
}

export interface ConversationListResponse {
  items: Conversation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export async function getConversations(
  token: string,
): Promise<ConversationListResponse> {
  return apiRequest<ConversationListResponse>(
    "/conversations?page=1&page_size=50",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}


export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ConversationMessagesResponse {
  conversation_id: string;
  title: string;
  messages: ChatMessage[];
}

export async function getConversationMessages(
  conversationId: string,
  token: string
): Promise<ConversationMessagesResponse> {
  return apiRequest<ConversationMessagesResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}
