import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class DataPreprocessor {

    public static void main(String[] args) {

        String filePath = "dataset/historical_train_data.csv";

        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {

            String line;
            boolean firstLine = true;

            System.out.println("========================================");
            System.out.println("   HISTORICAL TRAIN DATA PREPROCESSING");
            System.out.println("========================================");

            while ((line = br.readLine()) != null) {

                // Skip CSV header
                if (firstLine) {
                    firstLine = false;
                    continue;
                }

                String[] data = line.split(",");

                int trainNumber = Integer.parseInt(data[0]);
                double routeDistance = Double.parseDouble(data[1]);
                double currentSpeed = Double.parseDouble(data[2]);
                double currentDelay = Double.parseDouble(data[3]);
                double previousDelay = Double.parseDouble(data[4]);
                int weatherFactor = Integer.parseInt(data[5]);
                int trafficFactor = Integer.parseInt(data[6]);
                double futureDelay = Double.parseDouble(data[7]);

                System.out.println("----------------------------------------");
                System.out.println("Train Number       : " + trainNumber);
                System.out.println("Route Distance     : " + routeDistance + " km");
                System.out.println("Current Speed      : " + currentSpeed + " km/h");
                System.out.println("Current Delay      : " + currentDelay + " min");
                System.out.println("Previous Delay     : " + previousDelay + " min");
                System.out.println("Weather Factor     : " + weatherFactor);
                System.out.println("Traffic Factor     : " + trafficFactor);
                System.out.println("Future Delay       : " + futureDelay + " min");
            }

            System.out.println("========================================");
            System.out.println("DATA PREPROCESSING COMPLETED");
            System.out.println("========================================");

        } catch (IOException e) {
            System.out.println("Error reading dataset: " + e.getMessage());
        }
    }
}