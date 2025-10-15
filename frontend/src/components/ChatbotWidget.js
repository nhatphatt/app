import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MessageCircle, X, Send, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";

const ChatbotWidget = ({
  storeSlug,
  customerPhone,
  tableId,
  cart,
  onAddToCart,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll to bottom when new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send initial greeting when widget opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      sendMessage("Xin chào");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const sendMessage = async (messageText) => {
    if (!messageText.trim()) return;

    const userMessage = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/chatbot/message?store_slug=${storeSlug}`,
        {
          message: messageText,
          session_id: sessionId,
          customer_phone: customerPhone,
          table_id: tableId,
          cart_items: cart || [],
        },
      );

      // Save session ID for future messages
      if (!sessionId && response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      // Add bot response
      const botMessage = {
        role: "assistant",
        content: response.data.message,
        rich_content: response.data.rich_content,
        suggested_actions: response.data.suggested_actions,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);

      // Add error message
      const errorMessage = {
        role: "assistant",
        content: "Xin lỗi, mình gặp lỗi rồi. Bạn thử lại nhé!",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleQuickReply = (payload) => {
    sendMessage(payload);
  };

  const handleAddToCart = async (item) => {
    try {
      // Call backend action API to track in conversation
      await axios.post(
        `${BACKEND_URL}/api/chatbot/action?store_slug=${storeSlug}`,
        {
          action_type: "add_to_cart",
          action_payload: {
            item_id: item.item_id || item.id,
            quantity: 1,
          },
          session_id: sessionId,
        },
      );

      // Update parent component cart
      if (onAddToCart) {
        // Transform chatbot item to menu item format
        const menuItem = {
          id: item.item_id || item.id,
          name: item.name,
          price: item.has_promotion ? item.discounted_price : item.price,
          discounted_price: item.discounted_price,
          has_promotion: item.has_promotion,
          promotion_label: item.promotion_label,
          image_url: item.image_url,
          description: item.description,
        };
        onAddToCart(menuItem);

        // Show success message
        toast.success(`Đã thêm ${item.name} vào giỏ hàng!`);
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Không thể thêm món vào giỏ hàng. Vui lòng thử lại!");
    }
  };

  const renderMessage = (message, index) => {
    const isUser = message.role === "user";

    return (
      <div
        key={index}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isUser ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-900"
          }`}
        >
          {/* Message text */}
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* Rich content - Menu items carousel */}
          {message.rich_content?.type === "menu_items_carousel" && (
            <div className="mt-3 space-y-3">
              {message.rich_content.items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                >
                  {/* Item image */}
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-md mb-2"
                    />
                  )}

                  {/* Item info */}
                  <div className="font-semibold text-gray-900">{item.name}</div>

                  {/* Price */}
                  <div className="mt-1">
                    {item.has_promotion ? (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-bold">
                          {(item.discounted_price || 0).toLocaleString()}đ
                        </span>
                        <span className="text-gray-400 line-through text-sm">
                          {(item.price || 0).toLocaleString()}đ
                        </span>
                        {item.promotion_label && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                            {item.promotion_label}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-emerald-600 font-bold">
                        {(item.price || 0).toLocaleString()}đ
                      </span>
                    )}
                  </div>

                  {/* Reasons */}
                  {item.reasons && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Array.isArray(item.reasons) ? (
                        item.reasons.map((reason, ridx) => (
                          <span
                            key={ridx}
                            className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded"
                          >
                            {reason}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                          {item.reasons}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleAddToCart(item)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Thêm vào giỏ
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggested actions (Quick replies) */}
          {message.suggested_actions &&
            message.suggested_actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.suggested_actions.map((action, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(action.payload)}
                    className="text-sm bg-white text-emerald-600 hover:bg-emerald-50 px-3 py-1 rounded-full border border-emerald-600 transition-colors"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />

          {/* Notification badge */}
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            AI
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] bg-white rounded-lg shadow-2xl flex flex-col border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <div className="font-semibold">Trợ lý AI</div>
                <div className="text-xs opacity-90">
                  Luôn sẵn sàng hỗ trợ bạn
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {messages.map((message, index) => renderMessage(message, index))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">Đang trả lời...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-gray-200"
          >
            <div className="flex gap-2">
              <Input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Footer text */}
            <div className="text-xs text-gray-500 text-center mt-2">
              Powered by Minitake AI
            </div>
          </form>
        </div>
      )}

      {/* Mobile: Full screen on small devices */}
      <style jsx>{`
        @media (max-width: 640px) {
          .fixed.bottom-6.right-6.w-\\[380px\\].h-\\[600px\\] {
            width: 100vw;
            height: 100vh;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
        }
      `}</style>
    </>
  );
};

export default ChatbotWidget;
