package com.traineta.backend;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/train")
@CrossOrigin(origins = "*")
public class LiveTrainController {

    private final TrainDataProcessor processor;

    public LiveTrainController(TrainDataProcessor processor) {
        this.processor = processor;
    }

    @GetMapping("/live")
    public TrainDataProcessor.ProcessedTrainData getProcessedLiveTrainData() {

        // Simulated live train data
        LiveTrainData liveData = new LiveTrainData(
                "12123",
                "Nashik Road",
                68.0,
                18.0,
                "Manmad"
        );

        // Process live data before sending it forward
        return processor.process(liveData);
    }
}