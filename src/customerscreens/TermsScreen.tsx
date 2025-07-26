
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const TermsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Terms and Conditions</Text>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.content}>
          These Terms and Conditions govern your use of the NthomeRidez e-hailing platform, whether as a Passenger or Driver. By registering or using the service, you agree to comply with and be bound by these Terms.

          {'\n\n'}---

          {'\n\n'}1. Definitions{'\n'}
          "NthomeRidez" – The platform operated by [Your Company Name/NPO/Private Entity], offering e-hailing services.
          {'\n\n'}"User" – Any individual using the platform, including both Passengers and Drivers.
          {'\n\n'}"Driver" – An individual authorized to accept ride requests.
          {'\n\n'}"Passenger" – An individual who requests and takes rides via the platform.

          {'\n\n'}---

          {'\n\n'}2. User Eligibility{'\n'}
          Must be 18 years or older.
          {'\n\n'}Must have a valid government-issued ID.
          {'\n\n'}Drivers must possess a valid driver’s license, vehicle registration, roadworthy certificate, and necessary permits.

          {'\n\n'}---

          {'\n\n'}3. Use of the Platform{'\n'}
          Passengers:
          {'\n'}- Agree to request rides in good faith.
          {'\n'}- Agree to pay the fare as quoted on the app.
          {'\n'}- Must not engage in abusive, illegal, or unsafe conduct during the ride.

          {'\n\n'}Drivers:
          {'\n'}- Agree to provide safe, professional, and lawful transport services.
          {'\n'}- Must maintain clean, roadworthy vehicles.
          {'\n'}- Must not accept rides outside the app unless authorized.

          {'\n\n'}---

          {'\n\n'}4. Fares and Payments{'\n'}
          Fares are calculated based on distance, time, and vehicle type.
          {'\n\n'}Payment can be made via cash or through the in-app payment system (when applicable).
          {'\n\n'}A cancellation fee may apply if a trip is canceled too late.

          {'\n\n'}---

          {'\n\n'}5. Subscription Plans (If Applicable){'\n'}
          Subscription-based access may be available for frequent users or drivers.
          {'\n\n'}Plans must be paid in advance and are non-refundable unless otherwise stated.

          {'\n\n'}---

          {'\n\n'}6. Prohibited Conduct{'\n'}
          Users must not:
          {'\n'}- Harass, threaten, or harm drivers, passengers, or staff.
          {'\n'}- Use the app for illegal activities.
          {'\n'}- Provide false information during sign-up or trip requests.

          {'\n\n'}---

          {'\n\n'}7. Ratings and Reviews{'\n'}
          Users and drivers can rate each other after every trip.
          {'\n\n'}Repeated low ratings may result in suspension or removal from the platform.

          {'\n\n'}---

          {'\n\n'}8. Liability and Insurance{'\n'}
          NthomeRidez is not liable for any loss, damage, or injury that occurs during or as a result of the ride.
          {'\n\n'}Drivers are responsible for ensuring their vehicle is properly insured.

          {'\n\n'}---

          {'\n\n'}9. Termination{'\n'}
          NthomeRidez may suspend or terminate a user’s account for breach of terms, fraud, or safety concerns.
          {'\n\n'}Users may deactivate their accounts at any time.

          {'\n\n'}---

          {'\n\n'}10. Dispute Resolution{'\n'}
          Minor disputes should be reported through the app or customer support.
          {'\n\n'}Serious matters may be escalated to legal arbitration or relevant transport authorities.

          {'\n\n'}---

          {'\n\n'}11. Privacy Policy{'\n'}
          All user data is handled in accordance with POPIA (Protection of Personal Information Act).
          {'\n\n'}Data will not be sold or shared without consent.

          {'\n\n'}---

          {'\n\n'}12. Modifications to Terms{'\n'}
          NthomeRidez may update these Terms occasionally.
          {'\n\n'}Continued use after updates means you agree to the new terms.
        </Text>
      </ScrollView>
    </View>
  );
};

export default TermsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
  },
});




