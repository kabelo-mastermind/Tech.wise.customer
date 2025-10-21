import React from "react";
import AwesomeAlert from "react-native-awesome-alerts";

const CustomAlert = ({
  visible,
  title,
  message,
  type = "info", // info | error | success
  showCancelButton = false,
  showConfirmButton = true,
  cancelText = "Cancel",
  confirmText = "OK",
  onCancel,
  onConfirm,
  hideAlert,
}) => {
  return (
    <AwesomeAlert
      show={visible}
      showProgress={false}
      title={title}
      message={message}
      closeOnTouchOutside={false}
      closeOnHardwareBackPress={false}
      showCancelButton={showCancelButton}
      showConfirmButton={showConfirmButton}
      cancelText={cancelText}
      confirmText={confirmText}
      confirmButtonColor={type === "error" ? "#DD6B55" : "#0DCAF0"}
      onCancelPressed={() => {
        hideAlert && hideAlert();
        onCancel && onCancel();
      }}
      onConfirmPressed={() => {
        hideAlert && hideAlert();
        onConfirm && onConfirm();
      }}
    />
  );
};

export default CustomAlert;
