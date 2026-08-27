import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class DataPreprocessor {

    public static void main(String[] args) {

        String filePath = "dataset/historical_train_data.csv";

        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {

            String line;
            boolean firstLine = true;
            int recordCount = 0;

            System.out.println("========================================");
            System.out.println("      FEATURE ENGINEERING");
            System.out.println("========================================");

            System.out.println("\nSelected ML Features (X):");
            System.out.println("1. route_distance_km");
            System.out.println("2. current_speed_kmph");
            System.out.println("3. current_delay_min");
            System.out.println("4. previous_delay_min");
            System.out.println("5. weather_factor");
            System.out.println("6. traffic_factor");

            System.out.println("\nTarget (y):");
            System.out.println("future_delay_min");

            System.out.println("\nExcluded from ML features:");
            System.out.println("train_number");

            System.out.println("\n========================================");

            while ((line = br.readLine()) != null) {

                // Skip CSV header
                if (firstLine) {
                    firstLine = false;
                    continue;
                }

                String[] data = line.split(",");

                // Train identifier - not used as ML feature
                int trainNumber = Integer.parseInt(data[0]);

                // ML Features (X)
                double routeDistance = Double.parseDouble(data[1]);
                double currentSpeed = Double.parseDouble(data[2]);
                double currentDelay = Double.parseDouble(data[3]);
                double previousDelay = Double.parseDouble(data[4]);
                int weatherFactor = Integer.parseInt(data[5]);
                int trafficFactor = Integer.parseInt(data[6]);

                // ML Target (y)
                double futureDelay = Double.parseDouble(data[7]);

                recordCount++;

                System.out.println("----------------------------------------");
                System.out.println("Record             : " + recordCount);
                System.out.println("Train Number       : " + trainNumber);

                System.out.println("\nFeatures (X):");
                System.out.println("Route Distance     : " + routeDistance + " km");
                System.out.println("Current Speed      : " + currentSpeed + " km/h");
                System.out.println("Current Delay      : " + currentDelay + " min");
                System.out.println("Previous Delay     : " + previousDelay + " min");
                System.out.println("Weather Factor     : " + weatherFactor);
                System.out.println("Traffic Factor     : " + trafficFactor);

                System.out.println("\nTarget (y):");
                System.out.println("Future Delay       : " + futureDelay + " min");
            }

            System.out.println("\n========================================");
            System.out.println("FEATURE ENGINEERING COMPLETED");
            System.out.println("Total Records      : " + recordCount);
            System.out.println("Features (X)       : 6");
            System.out.println("Target (y)         : future_delay_min");
            System.out.println("========================================");

        } catch (IOException e) {
            System.out.println("Error reading dataset: " + e.getMessage());
        }
    }
}