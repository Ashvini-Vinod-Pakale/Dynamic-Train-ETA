import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

public class FutureDelayModel {

    // Model weights
    private static final double CURRENT_DELAY_WEIGHT = 0.40;
    private static final double PREVIOUS_DELAY_WEIGHT = 0.30;
    private static final double SPEED_WEIGHT = -0.10;
    private static final double WEATHER_WEIGHT = 2.00;
    private static final double TRAFFIC_WEIGHT = 3.00;

    public static double predictFutureDelay(
            double currentSpeed,
            double currentDelay,
            double previousDelay,
            int weatherFactor,
            int trafficFactor) {

        double prediction =
                (currentDelay * CURRENT_DELAY_WEIGHT)
                + (previousDelay * PREVIOUS_DELAY_WEIGHT)
                + (currentSpeed * SPEED_WEIGHT)
                + (weatherFactor * WEATHER_WEIGHT)
                + (trafficFactor * TRAFFIC_WEIGHT);

        // Future delay cannot be negative
        return Math.max(0, prediction);
    }

    public static void main(String[] args) {

        String filePath = "dataset/historical_train_data.csv";

        double totalAbsoluteError = 0.0;
        double totalSquaredError = 0.0;
        int totalRecords = 0;

        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {

            String line;
            boolean firstLine = true;

            System.out.println("========================================");
            System.out.println("      FUTURE DELAY PREDICTION MODEL");
            System.out.println("========================================");

            while ((line = br.readLine()) != null) {

                // Skip CSV header
                if (firstLine) {
                    firstLine = false;
                    continue;
                }

                String[] data = line.split(",");

                double currentSpeed = Double.parseDouble(data[2]);
                double currentDelay = Double.parseDouble(data[3]);
                double previousDelay = Double.parseDouble(data[4]);
                int weatherFactor = Integer.parseInt(data[5]);
                int trafficFactor = Integer.parseInt(data[6]);

                double actualFutureDelay =
                        Double.parseDouble(data[7]);

                double predictedFutureDelay =
                        predictFutureDelay(
                                currentSpeed,
                                currentDelay,
                                previousDelay,
                                weatherFactor,
                                trafficFactor
                        );

                // Error calculation
                double error =
                        predictedFutureDelay - actualFutureDelay;

                double absoluteError = Math.abs(error);
                double squaredError = error * error;

                totalAbsoluteError += absoluteError;
                totalSquaredError += squaredError;
                totalRecords++;

                System.out.println("----------------------------------------");

                System.out.println("Current Delay       : "
                        + currentDelay + " min");

                System.out.println("Current Speed       : "
                        + currentSpeed + " km/h");

                System.out.println("Predicted Future    : "
                        + String.format("%.2f", predictedFutureDelay)
                        + " min");

                System.out.println("Actual Future Delay : "
                        + actualFutureDelay + " min");

                System.out.println("Absolute Error      : "
                        + String.format("%.2f", absoluteError)
                        + " min");
            }

            // MAE
            double mae =
                    totalAbsoluteError / totalRecords;

            // RMSE
            double rmse =
                    Math.sqrt(totalSquaredError / totalRecords);

            System.out.println();
            System.out.println("========================================");
            System.out.println("          MODEL EVALUATION");
            System.out.println("========================================");

            System.out.println("Total Records : "
                    + totalRecords);

            System.out.println("MAE           : "
                    + String.format("%.2f", mae)
                    + " min");

            System.out.println("RMSE          : "
                    + String.format("%.2f", rmse)
                    + " min");

            System.out.println("========================================");
            System.out.println("FUTURE DELAY PREDICTION COMPLETED");
            System.out.println("========================================");

        } catch (IOException e) {

            System.out.println(
                    "Error reading dataset: "
                    + e.getMessage()
            );
        }
    }
}