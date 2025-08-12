"use client"

import { useEffect, useState, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal, StyleSheet } from "react-native"
import { Icon } from "react-native-elements"
import {
  listenToChatMessages,
  emitChatMessage,
  stopListeningToChatMessages,
  connectSocket,
} from "../configSocket/socketConfig"
import { useSelector } from "react-redux"
import AsyncStorage from "@react-native-async-storage/async-storage"



const CustomerChat = () => {
  const [optionsVisible, setOptionsVisible] = useState(null)
  const flatListRef = useRef(null)

  const user_id = useSelector((state) => state.auth.user?.user_id || "")
  const driverId = useSelector((state) => state.trip.tripData?.driver_id || "")
  const trip_id = useSelector((state) => state.trip.tripData?.tripId || "")
  const messagesFromRedux = useSelector((state) => state.message?.messages || [])

  console.log("messagesFromReduxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx:", messagesFromRedux);

  const [messages, setMessages] = useState([])
  const [messageText, setMessageText] = useState("")

  // useEffect(() => {
  //   AsyncStorage.clear(); // clear all persisted data
  // }, []);
  // 1. Sync local messages with Redux messages (chat history)
  useEffect(() => {
    setMessages(messagesFromRedux)
  }, [messagesFromRedux])

  useEffect(() => {
    if (user_id) {
      connectSocket(user_id, 'customer')
    }

    const handleNewMessage = (incomingMessage) => {
      setMessages(prev => [...prev, incomingMessage])
      console.log('Customer received message', incomingMessage);
    }

    listenToChatMessages(handleNewMessage)

    return () => {
      stopListeningToChatMessages()
    }
  }, [user_id])

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
      setMessages(prev => [...prev, messageData])
      emitChatMessage(messageData)
      setMessageText("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }


  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true })
      }, 100)
    }
  }, [messages.length])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Customer Chat</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        renderItem={({ item }) => {
          // Compare senderId and user_id as strings to avoid type issues
          const isSent = String(item.senderId) === String(user_id)
          return (
            <View style={[
              styles.messageBubble,
              isSent ? styles.sentMessage : styles.receivedMessage
            ]}>
              <Text style={[
                styles.messageText,
                isSent ? styles.sentText : styles.receivedText
              ]}>
                {item.message}
              </Text>
              <Text style={[
                styles.timestamp,
                isSent ? styles.sentTimestamp : styles.receivedTimestamp
              ]}>
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isSent && (
                <TouchableOpacity
                  style={styles.optionsButton}
                  onPress={() => setOptionsVisible(optionsVisible === item.id ? null : item.id)}
                >
                  <Icon name="more-vert" size={20} color="#fff" />
                </TouchableOpacity>
              )}
              {optionsVisible === item.id && (
                <View style={[
                  styles.optionsMenu,
                  isSent ? styles.sentOptionsMenu : styles.receivedOptionsMenu
                ]}>
                  {/* ...options... */}
                </View>
              )}
            </View>
          )
        }}
        contentContainerStyle={styles.messageList}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          placeholderTextColor="#999"
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <Icon name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // Reuse the exact same styles from DriverChat to maintain consistency
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 15,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messageList: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    position: 'relative',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderTopRightRadius: 0,
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
    borderTopLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  sentText: {
    color: '#fff',
  },
  receivedText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
  },
  sentTimestamp: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  receivedTimestamp: {
    color: 'rgba(0,0,0,0.5)',
    textAlign: 'left',
  },
  optionsButton: {
    position: 'absolute',
    right: -25,
    top: 0,
  },
  optionsMenu: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  sentOptionsMenu: {
    right: -25,
    top: 0,
  },
  receivedOptionsMenu: {
    left: -25,
    top: 0,
  },
  optionButton: {
    padding: 8,
  },
  optionText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    borderRadius: 5,
    padding: 10,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
})

export default CustomerChat