import * as FileSystem from 'expo-file-system';

/**
 * A simple utility for managing logs.
 */
const loggingUtility = {
  logs: [], // Array to hold logs for debugging
  logFile: `${FileSystem.documentDirectory}app_logs.txt`, // File to save logs locally

  /**
   * Logs a message with a given severity.
   * @param {string} level - The severity level (INFO, WARNING, ERROR, DEBUG).
   * @param {string} message - The message to log.
   */
  async logMessage(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    this.logs.push(logEntry);

    // Save the log to a file
    try {
      await FileSystem.appendToFileAsync(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Error saving log to file:', error);
    }

    console[level.toLowerCase()]?.(logEntry);
  },

  info(message) {
    this.logMessage('INFO', message);
  },
  warn(message) {
    this.logMessage('WARNING', message);
  },
  error(message) {
    this.logMessage('ERROR', message);
  },
  debug(message) {
    if (__DEV__) {
      this.logMessage('DEBUG', message);
    }
  },

  /**
   * Retrieves all logs saved in the file.
   */
  async getSavedLogs() {
    try {
      const fileExists = await FileSystem.getInfoAsync(this.logFile);
      if (!fileExists.exists) {
        return 'No logs available';
      }
      return await FileSystem.readAsStringAsync(this.logFile);
    } catch (error) {
      console.error('Error reading logs:', error);
      return 'Error reading logs';
    }
  },

  /**
   * Moves the log file to the Downloads directory.
   */
  async moveLogFileToDownloads() {
    const downloadsDir = FileSystem.documentDirectory + 'Downloads/';
    const newFilePath = `${downloadsDir}app_logs.txt`;

    try {
      await FileSystem.makeDirectoryAsync(downloadsDir, { intermediates: true });
      await FileSystem.moveAsync({
        from: this.logFile,
        to: newFilePath,
      });
      return newFilePath;
    } catch (error) {
      console.error('Error moving log file:', error);
      throw error;
    }
  },

  /**
   * Clears all logs from memory and the log file.
   */
  async clearLogs() {
    this.logs = [];
    try {
      await FileSystem.deleteAsync(this.logFile);
    } catch (error) {
      console.error('Error clearing logs:', error);
    }
  },

  /**
   * Returns the current log file path.
   */
  getLogFilePath() {
    return this.logFile;
  },
};

export default loggingUtility;
