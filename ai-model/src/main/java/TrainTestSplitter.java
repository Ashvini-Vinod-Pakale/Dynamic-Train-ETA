import java.io.*;
import java.util.*;

public class TrainTestSplitter {

    public static void main(String[] args) {

        String inputFile = "dataset/historical_train_data.csv";
        String trainFile = "dataset/train_data.csv";
        String testFile = "dataset/test_data.csv";

        List<String> data = new ArrayList<>();

        try (BufferedReader br = new BufferedReader(new FileReader(inputFile))) {

            String header = br.readLine();

            String line;

            while ((line = br.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    data.add(line);
                }
            }

            // Shuffle data before splitting
            Collections.shuffle(data, new Random(42));

            int totalRecords = data.size();

            // 80% training
            int trainSize = (int) Math.round(totalRecords * 0.80);

            // 20% testing
            int testSize = totalRecords - trainSize;

            // Create training dataset
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(trainFile))) {

                writer.write(header);
                writer.newLine();

                for (int i = 0; i < trainSize; i++) {
                    writer.write(data.get(i));
                    writer.newLine();
                }
            }

            // Create testing dataset
            try (BufferedWriter writer = new BufferedWriter(new FileWriter(testFile))) {

                writer.write(header);
                writer.newLine();

                for (int i = trainSize; i < totalRecords; i++) {
                    writer.write(data.get(i));
                    writer.newLine();
                }
            }

            System.out.println("========================================");
            System.out.println("       TRAIN / TEST DATASET SPLIT");
            System.out.println("========================================");

            System.out.println("Total Records   : " + totalRecords);
            System.out.println("Training Data   : " + trainSize + " (80%)");
            System.out.println("Testing Data    : " + testSize + " (20%)");

            System.out.println("----------------------------------------");

            System.out.println("Training File   : " + trainFile);
            System.out.println("Testing File    : " + testFile);

            System.out.println("----------------------------------------");
            System.out.println("TRAIN / TEST SPLIT COMPLETED");
            System.out.println("========================================");

        } catch (IOException e) {

            System.out.println("Error processing dataset: " + e.getMessage());
        }
    }
}