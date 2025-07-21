import { Text, TouchableOpacity, View, StyleSheet } from "react-native";

const CustomButton = ({
  onPress,
  title,
  bgVariant = "primary",
  textVariant = "default",
  IconLeft,
  IconRigth,
  className
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.baseButton,
        bgVariantStyles[bgVariant],
        className
      ]}
    >
      {IconLeft && (
        <View style={styles.iconLeft}>
          <IconLeft />
        </View>
      )}
      <Text style={[styles.text, textVariantStyles[textVariant]]}>{title}</Text>
      {IconRigth && (
        <View style={styles.iconRight}>
          <IconRigth />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});

const bgVariantStyles = {
  primary: { backgroundColor: "#007BFF" },
  secondary: { backgroundColor: "#6C757D" },
  none: {}, // Transparent
};

const textVariantStyles = {
  default: { color: "#000" },
  white: { color: "#FFF" },
  gray: { color: "#666" },
};

export default CustomButton;
