import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
      },
      modal: {
        backgroundColor: "#fff",
        width: "90%",
        borderRadius: 10,
        padding: 20,
        alignItems: "center",
      },
      title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 10,
      },
      subtitle: {
        fontSize: 16,
        marginVertical: 10,
      },
      thumbnailsContainer: {
        justifyContent: "center",
        alignItems: "center",
      },
      thumbnailWrapper: {
        marginHorizontal: 5,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: "transparent",
      },
      selectedWrapper: {
        borderColor: "#007bff",
      },
      thumbnail: {
        width: 60,
        height: 100,
        resizeMode: "cover",
      },
      previewContainer: {
        alignItems: "center",
        marginVertical: 10,
      },
      previewText: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 5,
      },
      previewImage: {
        width: 200,
        height: 350,
        resizeMode: "cover",
        borderRadius: 10,
      },
      buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginTop: 20,
      },
})