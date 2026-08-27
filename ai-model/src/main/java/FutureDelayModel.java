import java.io.*;
import java.util.*;

public class FutureDelayModel {

    // ========================================
    // 6 FEATURES
    // ========================================
    // 0 = route distance
    // 1 = current speed
    // 2 = current delay
    // 3 = previous delay
    // 4 = weather factor
    // 5 = traffic factor

    private static final int FEATURES = 6;

    private double[] weights = new double[FEATURES];
    private double bias = 0.0;

    // ========================================
    // PREDICTION
    // ========================================

    public double predict(double[] x) {

        double result = bias;

        for (int i = 0; i < FEATURES; i++) {
            result += weights[i] * x[i];
        }

        // Future delay cannot be negative
        return Math.max(0, result);
    }

    // ========================================
    // TRAIN MODEL
    // ========================================

    public void train(double[][] X, double[] y) {

        double learningRate = 0.00001;
        int epochs = 100000;

        Arrays.fill(weights, 0.0);
        bias = 0.0;

        for (int epoch = 0; epoch < epochs; epoch++) {

            double[] gradients = new double[FEATURES];
            double biasGradient = 0.0;

            for (int row = 0; row < X.length; row++) {

                double prediction = predictRaw(X[row]);

                double error = prediction - y[row];

                for (int feature = 0; feature < FEATURES; feature++) {

                    gradients[feature] +=
                            error * X[row][feature];
                }

                biasGradient += error;
            }

            for (int feature = 0; feature < FEATURES; feature++) {

                weights[feature] -=
                        learningRate
                        * gradients[feature]
                        / X.length;
            }

            bias -=
                    learningRate
                    * biasGradient
                    / X.length;
        }
    }

    // ========================================
    // RAW PREDICTION
    // ========================================

    private double predictRaw(double[] x) {

        double result = bias;

        for (int i = 0; i < FEATURES; i++) {
            result += weights[i] * x[i];
        }

        return result;
    }

    // ========================================
    // LOAD CSV DATASET
    // ========================================

    private static Dataset loadDataset(String filePath)
            throws IOException {

        List<double[]> features = new ArrayList<>();
        List<Double> targets = new ArrayList<>();

        try (BufferedReader br =
                     new BufferedReader(
                             new FileReader(filePath))) {

            // Skip CSV header
            br.readLine();

            String line;

            while ((line = br.readLine()) != null) {

                if (line.trim().isEmpty()) {
                    continue;
                }

                String[] data = line.split(",");

                /*
                 * CSV structure:
                 *
                 * train_number
                 * route_distance
                 * current_speed
                 * current_delay
                 * previous_delay
                 * weather_factor
                 * traffic_factor
                 * future_delay
                 */

                double[] x = new double[FEATURES];

                x[0] = Double.parseDouble(data[1]);
                x[1] = Double.parseDouble(data[2]);
                x[2] = Double.parseDouble(data[3]);
                x[3] = Double.parseDouble(data[4]);
                x[4] = Double.parseDouble(data[5]);
                x[5] = Double.parseDouble(data[6]);

                double y =
                        Double.parseDouble(data[7]);

                features.add(x);
                targets.add(y);
            }
        }

        double[][] X =
                features.toArray(new double[0][]);

        double[] y =
                new double[targets.size()];

        for (int i = 0; i < targets.size(); i++) {
            y[i] = targets.get(i);
        }

        return new Dataset(X, y);
    }

    // ========================================
    // SAVE TRAINED MODEL
    // ========================================

    private static void saveModel(
            FutureDelayModel model)
            throws IOException {

        File modelDirectory =
                new File("models");

        // Create models folder if it doesn't exist
        if (!modelDirectory.exists()) {
            modelDirectory.mkdirs();
        }

        File modelFile =
                new File(
                        "models/future_delay_model.txt");

        try (BufferedWriter writer =
                     new BufferedWriter(
                             new FileWriter(modelFile))) {

            writer.write(
                    "Future Delay Prediction Model"
            );
            writer.newLine();

            writer.write(
                    "RouteDistance="
                    + model.weights[0]
            );
            writer.newLine();

            writer.write(
                    "CurrentSpeed="
                    + model.weights[1]
            );
            writer.newLine();

            writer.write(
                    "CurrentDelay="
                    + model.weights[2]
            );
            writer.newLine();

            writer.write(
                    "PreviousDelay="
                    + model.weights[3]
            );
            writer.newLine();

            writer.write(
                    "WeatherFactor="
                    + model.weights[4]
            );
            writer.newLine();

            writer.write(
                    "TrafficFactor="
                    + model.weights[5]
            );
            writer.newLine();

            writer.write(
                    "Bias="
                    + model.bias
            );
            writer.newLine();
        }

        System.out.println("----------------------------------------");
        System.out.println("MODEL SAVED SUCCESSFULLY");
        System.out.println(
                "Model File : "
                + "models/future_delay_model.txt"
        );
    }

    // ========================================
    // MODEL EVALUATION
    // ========================================

    private static void evaluate(
            FutureDelayModel model,
            Dataset testData) {

        double totalAbsoluteError = 0.0;

        double totalSquaredError = 0.0;

        double meanActual = 0.0;

        // Calculate mean actual value
        for (double value : testData.y) {
            meanActual += value;
        }

        meanActual /= testData.y.length;

        double totalSquaredTotal = 0.0;

        System.out.println();

        System.out.println(
                "========================================"
        );

        System.out.println(
                "        TEST DATA PREDICTIONS"
        );

        System.out.println(
                "========================================"
        );

        for (int i = 0;
             i < testData.X.length;
             i++) {

            double actual =
                    testData.y[i];

            double predicted =
                    model.predict(
                            testData.X[i]
                    );

            double error =
                    predicted - actual;

            double absoluteError =
                    Math.abs(error);

            totalAbsoluteError +=
                    absoluteError;

            totalSquaredError +=
                    error * error;

            totalSquaredTotal +=
                    (actual - meanActual)
                    * (actual - meanActual);

            System.out.println(
                    "----------------------------------------"
            );

            System.out.println(
                    "Actual Future Delay    : "
                    + String.format(
                            "%.2f",
                            actual
                    )
                    + " min"
            );

            System.out.println(
                    "Predicted Future Delay : "
                    + String.format(
                            "%.2f",
                            predicted
                    )
                    + " min"
            );

            System.out.println(
                    "Absolute Error         : "
                    + String.format(
                            "%.2f",
                            absoluteError
                    )
                    + " min"
            );
        }

        // ========================================
        // MAE
        // ========================================

        double mae =
                totalAbsoluteError
                / testData.y.length;

        // ========================================
        // RMSE
        // ========================================

        double rmse =
                Math.sqrt(
                        totalSquaredError
                        / testData.y.length
                );

        // ========================================
        // R² SCORE
        // ========================================

        double r2 =
                1 -
                (
                        totalSquaredError
                        / totalSquaredTotal
                );

        System.out.println();

        System.out.println(
                "========================================"
        );

        System.out.println(
                "          MODEL EVALUATION"
        );

        System.out.println(
                "========================================"
        );

        System.out.println(
                "Test Records : "
                + testData.y.length
        );

        System.out.println(
                "MAE          : "
                + String.format(
                        "%.4f",
                        mae
                )
                + " min"
        );

        System.out.println(
                "RMSE         : "
                + String.format(
                        "%.4f",
                        rmse
                )
                + " min"
        );

        System.out.println(
                "R² Score     : "
                + String.format(
                        "%.4f",
                        r2
                )
        );

        System.out.println(
                "========================================"
        );
    }

    // ========================================
    // MAIN
    // ========================================

    public static void main(String[] args) {

        String trainFile =
                "dataset/train_data.csv";

        String testFile =
                "dataset/test_data.csv";

        try {

            System.out.println(
                    "========================================"
            );

            System.out.println(
                    "       JAVA FUTURE DELAY ML MODEL"
            );

            System.out.println(
                    "========================================"
            );

            // ========================================
            // LOAD TRAINING DATA
            // ========================================

            Dataset trainData =
                    loadDataset(trainFile);

            System.out.println(
                    "Training Records : "
                    + trainData.y.length
            );

            // ========================================
            // LOAD TEST DATA
            // ========================================

            Dataset testData =
                    loadDataset(testFile);

            System.out.println(
                    "Testing Records  : "
                    + testData.y.length
            );

            System.out.println(
                    "----------------------------------------"
            );

            System.out.println(
                    "Features : 6"
            );

            System.out.println(
                    "Target   : future_delay_min"
            );

            System.out.println(
                    "----------------------------------------"
            );

            // ========================================
            // CREATE MODEL
            // ========================================

            FutureDelayModel model =
                    new FutureDelayModel();

            // ========================================
            // TRAIN MODEL
            // ========================================

            System.out.println(
                    "Training model..."
            );

            model.train(
                    trainData.X,
                    trainData.y
            );

            System.out.println(
                    "Training completed."
            );

            // ========================================
            // SAVE MODEL
            // ========================================

            saveModel(model);

            // ========================================
            // DISPLAY WEIGHTS
            // ========================================

            System.out.println(
                    "----------------------------------------"
            );

            System.out.println(
                    "Learned Model Weights:"
            );

            System.out.println(
                    "Route Distance : "
                    + String.format(
                            "%.6f",
                            model.weights[0]
                    )
            );

            System.out.println(
                    "Current Speed  : "
                    + String.format(
                            "%.6f",
                            model.weights[1]
                    )
            );

            System.out.println(
                    "Current Delay  : "
                    + String.format(
                            "%.6f",
                            model.weights[2]
                    )
            );

            System.out.println(
                    "Previous Delay : "
                    + String.format(
                            "%.6f",
                            model.weights[3]
                    )
            );

            System.out.println(
                    "Weather Factor : "
                    + String.format(
                            "%.6f",
                            model.weights[4]
                    )
            );

            System.out.println(
                    "Traffic Factor : "
                    + String.format(
                            "%.6f",
                            model.weights[5]
                    )
            );

            System.out.println(
                    "Bias           : "
                    + String.format(
                            "%.6f",
                            model.bias
                    )
            );

            // ========================================
            // EVALUATE MODEL
            // ========================================

            evaluate(
                    model,
                    testData
            );

            System.out.println();

            System.out.println(
                    "FUTURE DELAY ML MODEL COMPLETED"
            );

        } catch (IOException e) {

            System.out.println(
                    "Error reading dataset: "
                    + e.getMessage()
            );
        }
    }

    // ========================================
    // DATASET CLASS
    // ========================================

    private static class Dataset {

        double[][] X;

        double[] y;

        Dataset(
                double[][] X,
                double[] y) {

            this.X = X;
            this.y = y;
        }
    }
}