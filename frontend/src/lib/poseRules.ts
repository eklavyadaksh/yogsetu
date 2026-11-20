import { LandmarkPoint, calculateAngle, calculateVerticalAngle, getMidpoint } from './angles';
import type { Language } from '../i18n';

export interface PoseEvaluation {
  isCorrect: boolean;
  accuracy: number; // 0 to 100
  feedback: string;
  primaryAngle: number;
  angles: Record<string, number>;
  rawDebug?: Record<string, any>;
}

/**
 * Validates that an actual human body is in the camera frame with full-body landmarks.
 * Prevents false positives when user walks away or webcam sees an empty chair/wall.
 */
function checkFullBodyPresence(landmarks: LandmarkPoint[], lang: Language): {
  valid: boolean;
  evaluation?: PoseEvaluation;
} {
  if (!landmarks || landmarks.length < 33) {
    return {
      valid: false,
      evaluation: {
        isCorrect: false,
        accuracy: 0,
        feedback:
          lang === 'en'
            ? 'Please step into camera frame to start.'
            : lang === 'hi'
            ? 'कृपया कैमरे के सामने आकर खड़े हों।'
            : 'Camera ke samne aakar frame mein khade hon.',
        primaryAngle: 0,
        angles: {},
      },
    };
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const shoulderVis = ((leftShoulder?.visibility || 0) + (rightShoulder?.visibility || 0)) / 2;
  const hipVis = ((leftHip?.visibility || 0) + (rightHip?.visibility || 0)) / 2;
  const kneeVis = ((leftKnee?.visibility || 0) + (rightKnee?.visibility || 0)) / 2;
  const ankleVis = ((leftAnkle?.visibility || 0) + (rightAnkle?.visibility || 0)) / 2;

  // Real human torso must be visible
  if (shoulderVis < 0.45 || hipVis < 0.4) {
    return {
      valid: false,
      evaluation: {
        isCorrect: false,
        accuracy: 0,
        feedback:
          lang === 'en'
            ? 'Step into view: upper body not detected.'
            : lang === 'hi'
            ? 'कैमरे के सामने आएं: शरीर स्पष्ट नहीं दिख रहा है।'
            : 'Camera frame mein poora shareer laayein.',
        primaryAngle: 0,
        angles: {},
      },
    };
  }

  // At least knees or ankles must be visible
  if (kneeVis < 0.35 && ankleVis < 0.35) {
    return {
      valid: false,
      evaluation: {
        isCorrect: false,
        accuracy: 0,
        feedback:
          lang === 'en'
            ? 'Step back so your legs and feet are visible.'
            : lang === 'hi'
            ? 'कैमरे से थोड़ा पीछे हटें ताकि पैर भी दिखाई दें।'
            : 'Thoda peeche hatein taaki pair bhi frame mein dikhein.',
        primaryAngle: 0,
        angles: {},
      },
    };
  }

  // Vertical body proportion check: In a true standing pose, the vertical distance
  // from shoulders to ankles/knees must be at least 28% of the frame height.
  const midShoulders = getMidpoint(leftShoulder, rightShoulder);
  const lowestPointY = Math.max(
    leftAnkle?.visibility && leftAnkle.visibility > 0.35 ? leftAnkle.y : 0,
    rightAnkle?.visibility && rightAnkle.visibility > 0.35 ? rightAnkle.y : 0,
    leftKnee?.visibility && leftKnee.visibility > 0.35 ? leftKnee.y : 0,
    rightKnee?.visibility && rightKnee.visibility > 0.35 ? rightKnee.y : 0
  );

  const verticalSpan = lowestPointY - midShoulders.y;
  if (verticalSpan < 0.28) {
    return {
      valid: false,
      evaluation: {
        isCorrect: false,
        accuracy: 0,
        feedback:
          lang === 'en'
            ? 'Step back so your full body from head to feet is visible.'
            : lang === 'hi'
            ? 'कैमरे से थोड़ा पीछे हटें ताकि सिर से पैर तक पूरा शरीर दिखे।'
            : 'Thoda peeche hatein taaki sar se pair tak poora shareer dikhe.',
        primaryAngle: 0,
        angles: {},
      },
    };
  }

  return { valid: true };
}

/**
 * Evaluates Tadasana (Mountain Pose).
 */
export function evaluateTadasana(landmarks: LandmarkPoint[], lang: Language = 'en'): PoseEvaluation {
  const presence = checkFullBodyPresence(landmarks, lang);
  if (!presence.valid && presence.evaluation) {
    return presence.evaluation;
  }

  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const midShoulders = getMidpoint(landmarks[11], landmarks[12]);
  const midHips = getMidpoint(leftHip, rightHip);

  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const spineTilt = calculateVerticalAngle(midShoulders, midHips);

  const angles = {
    left_knee: leftKneeAngle,
    right_knee: rightKneeAngle,
    spine_tilt: spineTilt,
  };

  let feedback =
    lang === 'en'
      ? 'Perfect Mountain Pose! Hold steady and breathe deeply.'
      : lang === 'hi'
      ? 'उत्तम ताड़ासन! स्थिरता बनाए रखें और गहरी सांस लें।'
      : 'Perfect! Aise hi bane rahein aur gehra saans lein.';
  let isCorrect = true;
  let penalty = 0;

  if (leftKneeAngle < 155 || rightKneeAngle < 155) {
    feedback =
      lang === 'en'
        ? 'Straighten your knees and keep your legs firm.'
        : lang === 'hi'
        ? 'घुटनों को सीधा और पैरों को मजबूत रखें।'
        : 'Ghutno ko thoda seedha aur mazboot karein.';
    isCorrect = false;
    penalty += Math.min(40, (155 - Math.min(leftKneeAngle, rightKneeAngle)) * 2);
  } else if (spineTilt > 15) {
    feedback =
      lang === 'en'
        ? 'Keep your spine and neck straight, do not lean.'
        : lang === 'hi'
        ? 'रीढ़ और गर्दन को सीधा रखें, एक तरफ न झुकें।'
        : 'Peeth aur gardan ko seedha rakhein, jhukein nahi.';
    isCorrect = false;
    penalty += Math.min(35, (spineTilt - 15) * 3);
  }

  const accuracy = isCorrect ? Math.max(75, Math.min(100, Math.round(100 - penalty))) : Math.max(15, Math.round(60 - penalty));
  const primaryAngle = Math.round(((leftKneeAngle + rightKneeAngle) / 2) * 10) / 10;

  return {
    isCorrect,
    accuracy,
    feedback,
    primaryAngle,
    angles,
  };
}

/**
 * Evaluates Vrikshasana (Tree Pose).
 */
export function evaluateVrikshasana(landmarks: LandmarkPoint[], lang: Language = 'en'): PoseEvaluation {
  const presence = checkFullBodyPresence(landmarks, lang);
  if (!presence.valid && presence.evaluation) {
    return presence.evaluation;
  }

  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];
  const midShoulders = getMidpoint(landmarks[11], landmarks[12]);
  const midHips = getMidpoint(leftHip, rightHip);

  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  const spineTilt = calculateVerticalAngle(midShoulders, midHips);

  const isLeftStanding = leftKneeAngle > rightKneeAngle;
  const standingAngle = isLeftStanding ? leftKneeAngle : rightKneeAngle;
  const bentAngle = isLeftStanding ? rightKneeAngle : leftKneeAngle;

  const angles = {
    standing_leg: standingAngle,
    bent_leg: bentAngle,
    spine_tilt: spineTilt,
  };

  let feedback =
    lang === 'en'
      ? 'Great balance! Hold steady and fix your gaze.'
      : lang === 'hi'
      ? 'शानदार संतुलन! दृष्टि को एक बिंदु पर टिकाए रखें।'
      : 'Shabash! Santulan banaye rakhein.';
  let isCorrect = true;
  let penalty = 0;

  if (standingAngle < 155) {
    feedback =
      lang === 'en'
        ? 'Straighten your standing leg firmly.'
        : lang === 'hi'
        ? 'खड़े पैर के घुटने को सीधा और मजबूत रखें।'
        : 'Khadhe pair ke ghutne ko seedha aur mazboot rakhein.';
    isCorrect = false;
    penalty += Math.min(30, (155 - standingAngle) * 2);
  } else if (bentAngle > 95 || bentAngle < 30) {
    feedback =
      lang === 'en'
        ? 'Open the bent knee out to the side.'
        : lang === 'hi'
        ? 'मुड़े हुए घुटने को बाहर की तरफ खोलें।'
        : 'Mode hue pair ke ghutne ko bahar ki or kholein.';
    isCorrect = false;
    penalty += 25;
  } else if (spineTilt > 15) {
    feedback =
      lang === 'en'
        ? 'Align your torso upright, avoid leaning sideways.'
        : lang === 'hi'
        ? 'शरीर को सीधा रखें, एक तरफ न झुकें।'
        : 'Shareer ko seedha rakhein, ek taraf jhukne na dein.';
    isCorrect = false;
    penalty += Math.min(25, (spineTilt - 15) * 2.5);
  }

  const accuracy = isCorrect ? Math.max(70, Math.min(100, Math.round(100 - penalty))) : 30;
  return {
    isCorrect,
    accuracy,
    feedback,
    primaryAngle: standingAngle,
    angles,
  };
}

/**
 * Evaluates Setu Bandhasana (Bridge Pose).
 */
export function evaluateSetuBandhasana(landmarks: LandmarkPoint[], lang: Language = 'en'): PoseEvaluation {
  if (!landmarks || landmarks.length < 33) {
    return {
      isCorrect: false,
      accuracy: 0,
      feedback:
        lang === 'en'
          ? 'Lie on your back on the mat in view.'
          : lang === 'hi'
          ? 'कैमरे के सामने चटाई पर पीठ के बल लेटें।'
          : 'Camera ke samne aakar mat par latein.',
      primaryAngle: 0,
      angles: {},
    };
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftKnee = landmarks[25];
  const rightKnee = landmarks[26];

  const shoulderVis = ((leftShoulder?.visibility || 0) + (rightShoulder?.visibility || 0)) / 2;
  const hipVis = ((leftHip?.visibility || 0) + (rightHip?.visibility || 0)) / 2;
  const kneeVis = ((leftKnee?.visibility || 0) + (rightKnee?.visibility || 0)) / 2;

  // Real hips and knees must be in view for bridge pose
  if (shoulderVis < 0.4 || hipVis < 0.35 || kneeVis < 0.3) {
    return {
      isCorrect: false,
      accuracy: 0,
      feedback:
        lang === 'en'
          ? 'Lie on your back on the mat with hips and knees in view.'
          : lang === 'hi'
          ? 'कैमरे के सामने चटाई पर पीठ के बल लेटें ताकि कमर और घुटने दिखें।'
          : 'Mat par peeth ke bal latein taaki kamar aur ghutne camera frame mein dikhein.',
      primaryAngle: 0,
      angles: {},
    };
  }

  const midShoulders = getMidpoint(leftShoulder, rightShoulder);
  const midHips = getMidpoint(leftHip, rightHip);
  const leftKneeAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
  const rightKneeAngle = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
  const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;

  // Check if user is sitting upright in chair (shoulders significantly above hips)
  const spineTilt = calculateVerticalAngle(midShoulders, midHips);
  const isUpright = spineTilt < 35 || midShoulders.y < midHips.y - 0.15;

  if (isUpright) {
    return {
      isCorrect: false,
      accuracy: 10,
      feedback:
        lang === 'en'
          ? 'Lie flat on your back on mat and lift your hips.'
          : lang === 'hi'
          ? 'पीठ के बल लेटें, घुटने मोड़ें और कमर को ऊपर उठाएं।'
          : 'Peeth ke bal mat par latein aur kamar ko upar uthayein.',
      primaryAngle: avgKneeAngle,
      angles: { spine_tilt: spineTilt, knee_angle: avgKneeAngle },
    };
  }

  let isCorrect = true;
  let penalty = 0;
  let feedback =
    lang === 'en'
      ? 'Great Bridge Pose! Keep hips lifted and glutes engaged.'
      : lang === 'hi'
      ? 'कमर को ऊपर उठाए रखें और गहरी सांस लें।'
      : 'Shabash! Kamar ko upar uthaye rakhein aur gehra saans lein.';

  if (avgKneeAngle < 60 || avgKneeAngle > 130) {
    isCorrect = false;
    feedback =
      lang === 'en'
        ? 'Bend your knees around 90 degrees with feet flat on mat.'
        : lang === 'hi'
        ? 'घुटनों को लगभग 90 अंश पर मोड़ें और तलवों को जमीन पर टिकाएं।'
        : 'Ghutno ko 90 degree ke aas-paas modein aur pair mat par tikayein.';
    penalty += 35;
  }

  const accuracy = isCorrect ? Math.max(70, Math.round(95 - penalty)) : 25;
  return {
    isCorrect,
    accuracy,
    feedback,
    primaryAngle: Math.round(avgKneeAngle),
    angles: { knee_angle: avgKneeAngle, spine_tilt: spineTilt },
  };
}

/**
 * Evaluates Bhujangasana (Cobra Pose).
 */
export function evaluateBhujangasana(landmarks: LandmarkPoint[], lang: Language = 'en'): PoseEvaluation {
  if (!landmarks || landmarks.length < 33) {
    return {
      isCorrect: false,
      accuracy: 0,
      feedback:
        lang === 'en'
          ? 'Lie prone on your stomach on the mat.'
          : lang === 'hi'
          ? 'चटाई पर पेट के बल लेटें।'
          : 'Mat par pet ke bal latein.',
      primaryAngle: 0,
      angles: {},
    };
  }

  const midShoulders = getMidpoint(landmarks[11], landmarks[12]);
  const midHips = getMidpoint(landmarks[23], landmarks[24]);
  const spineTilt = calculateVerticalAngle(midShoulders, midHips);

  // If sitting upright in a chair
  if (spineTilt < 35 && midShoulders.y < midHips.y - 0.2) {
    return {
      isCorrect: false,
      accuracy: 10,
      feedback:
        lang === 'en'
          ? 'Lie on your stomach and lift your chest gently.'
          : lang === 'hi'
          ? 'पेट के बल लेटें और छाती को आगे से ऊपर उठाएं।'
          : 'Pet ke bal latein aur chhaati ko aage se upar uthayein.',
      primaryAngle: spineTilt,
      angles: { spine_tilt: spineTilt },
    };
  }

  const isCorrect = midShoulders.y < midHips.y;
  return {
    isCorrect,
    accuracy: isCorrect ? 90 : 25,
    feedback: isCorrect
      ? lang === 'en'
        ? 'Excellent Cobra Pose! Relax shoulders and expand your chest.'
        : lang === 'hi'
        ? 'बहुत अच्छे! कंधों को ढीला रखें और छाती को फैलाएं।'
        : 'Bahut achhe! Kandho ko dheela rakhein aur chhaati ko stretch karein.'
      : lang === 'en'
      ? 'Press palms into mat and lift chest slightly higher.'
      : lang === 'hi'
      ? 'हथेलियों के सहारे छाती को थोड़ा और ऊपर उठाएं।'
      : 'Hathheliyo ke sahare chhaati ko thoda aur upar uthayein.',
    primaryAngle: Math.round(spineTilt),
    angles: { spine_tilt: spineTilt },
  };
}

/**
 * Evaluates Balasana (Child's Pose).
 */
export function evaluateBalasana(landmarks: LandmarkPoint[], lang: Language = 'en'): PoseEvaluation {
  if (!landmarks || landmarks.length < 33) {
    return {
      isCorrect: false,
      accuracy: 0,
      feedback:
        lang === 'en'
          ? 'Rest in Child\'s Pose on your mat.'
          : lang === 'hi'
          ? 'घुटनों के बल बैठकर बालासन की मुद्रा में आएं।'
          : 'Ghutno ke bal aakar Balasana sthiti lein.',
      primaryAngle: 0,
      angles: {},
    };
  }

  const midShoulders = getMidpoint(landmarks[11], landmarks[12]);
  const midHips = getMidpoint(landmarks[23], landmarks[24]);
  const spineTilt = calculateVerticalAngle(midShoulders, midHips);

  // If sitting upright
  if (spineTilt < 25 && midShoulders.y < midHips.y - 0.2) {
    return {
      isCorrect: false,
      accuracy: 15,
      feedback:
        lang === 'en'
          ? 'Sit on heels, fold forward, and rest forehead on mat.'
          : lang === 'hi'
          ? 'घुटनों पर बैठें, आगे झुकें और माथा चटाई पर टिकाएं।'
          : 'Ghutno ke bal baithkar aage jhukein aur maatha mat par tikaayein.',
      primaryAngle: spineTilt,
      angles: { spine_tilt: spineTilt },
    };
  }

  return {
    isCorrect: true,
    accuracy: 90,
    feedback:
      lang === 'en'
        ? 'Rest and breathe calmly in Child\'s Pose.'
        : lang === 'hi'
        ? 'पीठ को ढीला छोड़ें और शांति से सांस लें।'
        : 'Poori peeth ko dheela chhod dein aur shanti se saans lein.',
    primaryAngle: 0,
    angles: {},
  };
}

/**
 * Evaluates Virabhadrasana II (Warrior 2).
 */
export function evaluateVirabhadrasana(landmarks: LandmarkPoint[], lang: Language = 'en'): PoseEvaluation {
  const presence = checkFullBodyPresence(landmarks, lang);
  if (!presence.valid && presence.evaluation) {
    return presence.evaluation;
  }

  const leftKneeAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
  const rightKneeAngle = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
  const isLeftBent = leftKneeAngle < rightKneeAngle;
  const bentAngle = isLeftBent ? leftKneeAngle : rightKneeAngle;
  const straightAngle = isLeftBent ? rightKneeAngle : leftKneeAngle;

  let isCorrect = true;
  let feedback =
    lang === 'en'
      ? 'Strong Warrior 2! Gaze forward over your front fingers.'
      : lang === 'hi'
      ? 'शानदार वीरभद्रासन! आगे की ओर नजरें रखें।'
      : 'Shaandar Warrior 2 pose! Nazrein aage rakhein.';
  let penalty = 0;

  if (bentAngle > 120 || bentAngle < 70) {
    isCorrect = false;
    feedback =
      lang === 'en'
        ? 'Bend your front knee closer to 90 degrees.'
        : lang === 'hi'
        ? 'आगे वाले घुटने को 90 डिग्री के करीब मोड़ें।'
        : 'Aage wale ghutne ko 90 degree ke aas-paas bend karein.';
    penalty += 30;
  }
  if (straightAngle < 155) {
    isCorrect = false;
    feedback =
      lang === 'en'
        ? 'Keep your back leg straight and grounded.'
        : lang === 'hi'
        ? 'पीछे वाले पैर को बिल्कुल सीधा और मजबूत रखें।'
        : 'Peeche wale pair ko bilkul seedha aur tight rakhein.';
    penalty += 25;
  }

  return {
    isCorrect,
    accuracy: isCorrect ? Math.max(70, Math.round(95 - penalty)) : 25,
    feedback,
    primaryAngle: Math.round(bentAngle),
    angles: { front_knee: bentAngle, back_knee: straightAngle },
  };
}

/**
 * Main pose evaluator supporting dynamic localization (English, Hindi, Hinglish).
 */
export function evaluatePose(
  poseId: string,
  landmarks: LandmarkPoint[],
  lang: Language = 'en'
): PoseEvaluation {
  if (poseId === 'tadasana') {
    return evaluateTadasana(landmarks, lang);
  }
  if (poseId === 'vrikshasana') {
    return evaluateVrikshasana(landmarks, lang);
  }
  if (poseId === 'setu_bandhasana') {
    return evaluateSetuBandhasana(landmarks, lang);
  }
  if (poseId === 'bhujangasana') {
    return evaluateBhujangasana(landmarks, lang);
  }
  if (poseId === 'balasana') {
    return evaluateBalasana(landmarks, lang);
  }
  if (poseId === 'virabhadrasana_ii') {
    return evaluateVirabhadrasana(landmarks, lang);
  }

  // Generic / seated / mobility poses (Neck Rolls, Cat-Cow, Butterfly, etc.)
  if (!landmarks || landmarks.length < 33) {
    return {
      isCorrect: false,
      accuracy: 0,
      feedback:
        lang === 'en'
          ? 'Step into camera frame to begin posture.'
          : lang === 'hi'
          ? 'आसन शुरू करने के लिए कैमरे के सामने आएं।'
          : 'Camera ke samne aakar frame mein aasan shuru karein.',
      primaryAngle: 0,
      angles: {},
    };
  }

  const shoulderVis = ((landmarks[11]?.visibility || 0) + (landmarks[12]?.visibility || 0)) / 2;
  const hipVis = ((landmarks[23]?.visibility || 0) + (landmarks[24]?.visibility || 0)) / 2;

  if (shoulderVis < 0.45 || hipVis < 0.35) {
    return {
      isCorrect: false,
      accuracy: 0,
      feedback:
        lang === 'en'
          ? 'Position yourself in front of camera with torso visible.'
          : lang === 'hi'
          ? 'कैमरे के सामने आएं ताकि शरीर स्पष्ट दिखे।'
          : 'Camera ke samne aakar shareer ko frame mein laayein.',
      primaryAngle: 0,
      angles: {},
    };
  }

  return {
    isCorrect: true,
    accuracy: 85,
    feedback:
      lang === 'en'
        ? 'Good posture! Breathe smoothly and maintain the stretch.'
        : lang === 'hi'
        ? 'आसन की मुद्रा में बने रहें और शांति से सांस लें।'
        : 'Aasan ki mudra mein bane rahein aur shanti se saans lein.',
    primaryAngle: 0,
    angles: {},
  };
}
