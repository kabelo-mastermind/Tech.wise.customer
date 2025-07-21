"use client"

import { useEffect, useState, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal } from "react-native"
import { Icon } from "react-native-elements"
import {
  listenToChatMessages,
  emitChatMessage,
  stopListeningToChatMessages,
  emitEditMessage,
  listenToEditedMessages,
  emitDeleteMessage,
  listenToDeletedMessages,
  connectSocket,
} from "../configSocket/socketConfig"
import { useSelector } from "react-redux"

const CustomerChat = () => {
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editedMessageText, setEditedMessageText] = useState("")
  const [selectedMessageId, setSelectedMessageId] = useState(null)
  const [optionsVisible, setOptionsVisible] = useState(null)
  const flatListRef = useRef(null)
  const prevMessageRef = useRef(null) // To track previous message state

  // Redux selectors
  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const driverId = useSelector((state) => state.trip.tripData?.driver_id || "")
  const trip_id = useSelector((state) => state.trip.tripData?.tripId || "")
  const message = useSelector((state) => state.message.message || [])
  console.log('Trip',driverId);
  console.log('trip=====',trip_id);
console.log('driverId',driverId);
  // State for messages and input text
  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState("")

  useEffect(() => {
    if (user_id) {
      connectSocket(user_id, 'customer')
    }
  
    listenToChatMessages((incomingMessage) => {
      setMessages(prev => [...prev, incomingMessage])
      console.log('Incoming message', incomingMessage);
    })
  
    listenToEditedMessages((updatedMessage) => {
      setMessages(prev =>
        prev.map(msg => msg.id === updatedMessage.id ? { ...msg, message: updatedMessage.message } : msg)
      )
    })
  
    listenToDeletedMessages((deletedMessage) => {
      setMessages(prev => prev.filter(msg => msg.id !== deletedMessage.id))
    })
  
    return () => {
      stopListeningToChatMessages()
    }
  }, [user_id])
  // Effect to handle incoming messages from Redux - FIXED to prevent infinite loop
  useEffect(() => {
    // Skip if message is empty or undefined
    if (!message) return
    
    // Skip if the message reference is the same as before (prevents unnecessary updates)
    if (message === prevMessageRef.current) return
    
    // Update our ref to the current message
    prevMessageRef.current = message
    
    if (Array.isArray(message?.message) && message.message.length > 0) {
      // Check if we have new messages to add
      const newMessages = message.message.filter(
        newMsg => !messages.some(existingMsg => existingMsg.id === newMsg.id)
      )
      
      if (newMessages.length > 0) {
        setMessages(prevMessages => [...prevMessages, ...newMessages])
      }
    } else if (typeof message?.message === "string" && message.message.trim() !== "") {
      // For string messages, add as a new message object
      const newMessageObj = { 
        message: message.message, 
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        senderId: user_id // Assuming this is from the current user
      }
      
      setMessages(prevMessages => [...prevMessages, newMessageObj])
    }
  }, [message, messages]) // Include messages in dependency array to check for duplicates

  // Function to send a new chat message
  const sendMessage = async () => {
    if (!messageText.trim()) return

    const messageData = {
      id: Date.now().toString(),
      senderId: user_id,
      receiverId: driverId,
      tripId: trip_id,
      message: messageText.trim(),
      timestamp: new Date().toISOString(),
    }

    try {
      // Add to local state first
      setMessages(prevMessages => [...prevMessages, messageData])
      console.log('Sent message', messageData);
      
      // Then emit the message
      emitChatMessage(messageData)
      setMessageText("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Effect to handle socket connections and listeners - FIXED to prevent multiple listeners
  useEffect(() => {
    // Connect socket only once
    connectSocket(user_id, "driver")

    // Set up listeners
    const handleNewMessage = (messageData) => {
        // Ignore messages sent by the current user to prevent duplication
        if (messageData.senderId === user_id) return;
      
        setMessages(prevMessages => {
          const exists = prevMessages.some(msg => msg.id === messageData.id);
          if (exists) return prevMessages;
          return [...prevMessages, messageData];
        });
      };
      

    const handleEditedMessage = (updatedMessage) => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.id === updatedMessage.messageId ? { ...msg, message: updatedMessage.newMessage } : msg
        )
      )
    }

    const handleDeletedMessage = ({ messageId }) => {
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId))
    }

    // Register listeners
    listenToChatMessages(handleNewMessage)
    listenToEditedMessages(handleEditedMessage)
    listenToDeletedMessages(handleDeletedMessage)

    // Cleanup function to prevent memory leaks
    return () => {
      stopListeningToChatMessages()
    }
  }, [user_id]) // Only re-run if user_id changes

  // Helper functions for editing and deleting messages
  const editMessage = () => {
    if (!editedMessageText.trim()) return

    // Update local messages state
    setMessages(prevMessages =>
      prevMessages.map(msg => (msg.id === selectedMessageId ? { ...msg, message: editedMessageText } : msg))
    )

    // Emit the edit event
    emitEditMessage({
      messageId: selectedMessageId,
      newMessage: editedMessageText.trim(),
      senderId: user_id,
      receiverId: driverId,
      timestamp: new Date().toISOString(),
    })

    // Close modal and options
    setEditModalVisible(false)
    setOptionsVisible(null)
  }

  const deleteMessage = (messageId) => {
    Alert.alert("Delete Message", "Are you sure you want to delete this message?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: () => {
          // Update local messages state
          setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId))

          // Emit the delete event
          emitDeleteMessage({ messageId, senderId: user_id, receiverId: driverId })
        },
        style: "destructive",
      },
    ])

    // Hide options menu after deletion
    setOptionsVisible(null)
  }

  // Scroll to bottom of FlatList - FIXED to prevent unnecessary calls
  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true })
    }
  }

  // Only scroll when messages change, with proper dependency
  useEffect(() => {
    // Use a timeout to ensure the FlatList has updated
    const timer = setTimeout(() => {
      scrollToBottom()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [messages.length]) // Only depend on messages.length, not the entire messages array

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item?.id?.toString() || `msg-${index}`}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.senderId === user_id ? styles.sentMessage : styles.receivedMessage]}>
            <Text style={[styles.messageText, item.senderId === user_id ? { color: "#fff" } : { color: "#333" }]}>
              {item.message}
            </Text>
            <Text
              style={[
                styles.timestamp,
                item.senderId === user_id ? { color: "rgba(255,255,255,0.7)" } : { color: "rgba(0,0,0,0.5)" },
              ]}
            >
              {new Date(item.timestamp).toLocaleTimeString()}
            </Text>

            {item.senderId === user_id && (
              <TouchableOpacity
                style={styles.optionsButton}
                onPress={() => setOptionsVisible(optionsVisible === item.id ? null : item.id)}
              >
                <Icon name="more-vert" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {optionsVisible === item.id && (
              <View style={styles.optionsMenu}>
                <TouchableOpacity
                  style={styles.optionText}
                  onPress={() => {
                    setSelectedMessageId(item.id)
                    setEditedMessageText(item.message)
                    setEditModalVisible(true)
                  }}
                >
                  <Text>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.optionText} onPress={() => deleteMessage(item.id)}>
                  <Text>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Icon name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Message</Text>
            <TextInput style={styles.modalInput} value={editedMessageText} onChangeText={setEditedMessageText} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={editMessage}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  messageBubble: {
    marginVertical: 6,
    padding: 12,
    borderRadius: 18,
    maxWidth: "75%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    position: "relative",
  },
  sentMessage: {
    backgroundColor: "#0084ff",
    alignSelf: "flex-end",
    borderTopRightRadius: 4,
    marginRight: 10,
  },
  receivedMessage: {
    backgroundColor: "#ffffff",
    alignSelf: "flex-start",
    borderTopLeftRadius: 4,
    marginLeft: 10,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginRight: 20,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
    opacity: 0.7,
  },
  optionsButton: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  optionsMenu: {
    backgroundColor: "#ffffff",
    position: "absolute",
    bottom: "100%", // Position above the message bubble
    right: 5,
    marginBottom: 25, // Add some space between menu and message
    padding: 8,
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 10,
  },
  optionText: {
    padding: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f8f8",
    fontSize: 15,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#0084ff",
    padding: 12,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    width: 48,
    height: 48,
    shadowColor: "#0084ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    width: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#333",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f8f8",
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  saveButton: {
    backgroundColor: "#0084ff",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  messageList: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingVertical: 10,
  },
}

export default CustomerChat