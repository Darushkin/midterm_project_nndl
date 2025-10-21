// app.js
document.getElementById('healthForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const formData = {
        age: parseInt(document.getElementById('age').value),
        gender: document.getElementById('gender').value,
        weight: parseFloat(document.getElementById('weight').value),
        height: parseFloat(document.getElementById('height').value),
        fatPercentage: parseFloat(document.getElementById('fatPercentage').value),
        restingBPM: parseInt(document.getElementById('restingBPM').value),
        avgBPM: document.getElementById('avgBPM').value ? parseInt(document.getElementById('avgBPM').value) : null,
        maxBPM: document.getElementById('maxBPM').value ? parseInt(document.getElementById('maxBPM').value) : null,
        waterIntake: parseFloat(document.getElementById('waterIntake').value),
        dailyMeals: parseInt(document.getElementById('dailyMeals').value),
        dietType: document.getElementById('dietType').value,
        calories: parseInt(document.getElementById('calories').value),
        protein: parseFloat(document.getElementById('protein').value),
        workoutFrequency: parseFloat(document.getElementById('workoutFrequency').value),
        experienceLevel: parseInt(document.getElementById('experienceLevel').value),
        workoutType: document.getElementById('workoutType').value,
        sessionDuration: parseFloat(document.getElementById('sessionDuration').value),
        caloriesBurned: parseInt(document.getElementById('caloriesBurned').value)
    };
    
    // Calculate BMI
    formData.bmi = formData.weight / (formData.height * formData.height);
    
    // Generate recommendations
    const recommendations = generateRecommendations(formData);
    
    // Display results
    displayResults(formData, recommendations);
});

function generateRecommendations(data) {
    const recommendations = [];
    
    // 1. Hydration Analysis
    if (data.waterIntake < 2.5) {
        recommendations.push({
            category: "Hydration",
            message: `You're drinking ${data.waterIntake}L of water daily. Aim for at least 2.5-3.5 liters to improve hydration, support metabolism, and aid recovery.`
        });
    }
    
    // 2. Nutrition & Diet Analysis
    // Caloric Balance
    const dailyCaloricBalance = data.calories - data.caloriesBurned;
    
    if (dailyCaloricBalance > 500 && data.bmi >= 25) {
        recommendations.push({
            category: "Nutrition",
            message: "You may be in a caloric surplus. Consider a slight caloric deficit to support weight management, focusing on nutrient-dense foods."
        });
    }
    
    if (dailyCaloricBalance < -500 && data.bmi < 18.5) {
        recommendations.push({
            category: "Nutrition",
            message: "You may be in a significant caloric deficit. Ensure you're eating enough to fuel your activity level and support muscle maintenance."
        });
    }
    
    // Protein Intake
    const proteinTarget = 1.6 * data.weight;
    if (data.protein < proteinTarget && data.workoutFrequency > 2) {
        recommendations.push({
            category: "Nutrition",
            message: `To support muscle repair and growth, consider increasing your protein intake. A target of around ${proteinTarget.toFixed(0)} grams per day is recommended for active individuals.`
        });
    }
    
    // Meal Frequency
    if (data.dailyMeals < 3) {
        recommendations.push({
            category: "Nutrition",
            message: "Eating more frequently throughout the day can help regulate blood sugar and energy levels. Try to have at least 3 balanced meals."
        });
    }
    
    // 3. Physical Activity & Exercise Analysis
    // Frequency
    if (data.workoutFrequency < 3) {
        recommendations.push({
            category: "Exercise",
            message: "Aim for at least 150 minutes of moderate-intensity exercise per week. Try to incorporate activity on 3-5 days for optimal health benefits."
        });
    }
    
    // Variety
    if (data.workoutType === "Strength" && data.workoutFrequency >= 3) {
        recommendations.push({
            category: "Exercise",
            message: "Great job on consistency with strength training! For well-rounded fitness, consider adding 1-2 cardio sessions per week to improve cardiovascular health."
        });
    } else if (data.workoutType === "Cardio" && data.workoutFrequency >= 3) {
        recommendations.push({
            category: "Exercise",
            message: "Great job on consistency with cardio! For well-rounded fitness, consider adding 1-2 strength training sessions per week to build muscle and bone density."
        });
    }
    
    // Beginner Guidance
    if (data.experienceLevel === 1 && (data.workoutType === "HIIT" || data.sessionDuration > 1.5)) {
        recommendations.push({
            category: "Exercise",
            message: "As a beginner, it's important to build a foundation. Focus on proper form with strength training and moderate-intensity cardio before advancing to high-intensity workouts to prevent injury."
        });
    }
    
    // 4. Body Composition Analysis
    // BMI
    if (data.bmi < 18.5) {
        recommendations.push({
            category: "Body Composition",
            message: "Your BMI suggests you may be underweight. Consider consulting a healthcare professional for a lean mass gain strategy focused on nutrient-dense foods and strength training."
        });
    } else if (data.bmi >= 25 && data.bmi < 30) {
        recommendations.push({
            category: "Body Composition",
            message: "Your BMI is in the overweight range. A combination of strength training and moderate caloric deficit can help improve body composition."
        });
    } else if (data.bmi >= 30) {
        recommendations.push({
            category: "Body Composition",
            message: "Your BMI is in the obese range. Consider consulting a healthcare provider for a sustainable weight loss plan focusing on nutrition and gradual increase in physical activity."
        });
    }
    
    // Body Fat
    const highBodyFatMale = data.gender === "Male" && data.fatPercentage > 25;
    const highBodyFatFemale = data.gender === "Female" && data.fatPercentage > 32;
    
    if (highBodyFatMale || highBodyFatFemale) {
        recommendations.push({
            category: "Body Composition",
            message: "Incorporating more cardiovascular exercise and strength training can help improve body composition by reducing fat and building muscle."
        });
    }
    
    // 5. Cardiovascular Health Analysis
    // Resting Heart Rate
    if (data.restingBPM > 80) {
        recommendations.push({
            category: "Cardiovascular Health",
            message: "Your resting heart rate is elevated. Regular cardiovascular exercise can help lower your resting heart rate over time, improving heart health."
        });
    }
    
    // Exercise Intensity
    if (data.avgBPM && data.maxBPM) {
        const intensityRatio = data.avgBPM / data.maxBPM;
        if (intensityRatio < 0.6) {
            recommendations.push({
                category: "Exercise",
                message: "To improve cardiovascular fitness, try to work in higher intensity zones where you feel your breath deepening. Aim for an average heart rate of 70-85% of your max during cardio sessions."
            });
        }
    }
    
    // 6. Recovery & Balance
    // Overtraining
    if (data.workoutFrequency >= 6 && data.restingBPM > 75) {
        recommendations.push({
            category: "Recovery",
            message: "Your activity level is high. Ensure you are incorporating 1-2 rest days per week for muscle recovery and to prevent overtraining."
        });
    }
    
    // Limit to 5 most important recommendations
    return recommendations.slice(0, 5);
}

function displayResults(data, recommendations) {
    const resultsDiv = document.getElementById('results');
    const profileSummary = document.getElementById('profileSummary');
    const recommendationsList = document.getElementById('recommendationsList');
    
    // Generate profile summary
    let profileText = "Your Health Profile: ";
    const profileTags = [];
    
    if (data.bmi < 18.5) profileTags.push("Underweight");
    else if (data.bmi >= 18.5 && data.bmi < 25) profileTags.push("Normal Weight");
    else if (data.bmi >= 25 && data.bmi < 30) profileTags.push("Overweight");
    else profileTags.push("Obese");
    
    if (data.waterIntake < 2.5) profileTags.push("Under-Hydrated");
    
    if (data.workoutFrequency < 2) profileTags.push("Sedentary");
    else if (data.workoutFrequency >= 2 && data.workoutFrequency < 4) profileTags.push("Moderately Active");
    else profileTags.push("Active");
    
    if (data.restingBPM > 80) profileTags.push("Elevated Resting HR");
    
    profileText += profileTags.join(", ");
    profileSummary.textContent = profileText;
    
    // Display recommendations
    recommendationsList.innerHTML = '';
    recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.className = 'recommendation-item';
        li.innerHTML = `
            <div class="category">${rec.category}</div>
            <div>${rec.message}</div>
        `;
        recommendationsList.appendChild(li);
    });
    
    // Show results section
    resultsDiv.style.display = 'block';
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}
