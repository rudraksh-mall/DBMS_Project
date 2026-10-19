export const fallbackClassify = (description = "") => {
  const text = description.toLowerCase();

  let category = "other";
  let severity = "medium";
  let keywords = [];

  if (
    /garbage|trash|waste|dump|litter|rubbish|kuda|kachra|dustbin|overflowing bin|unclean|filth|dirty/.test(
      text
    )
  ) {
    category = "garbage";
    keywords.push("garbage", "waste", "cleanliness", "overflowing-bin");
  }

  if (
    /drain|drainage|sewer|nali|waterlogging|blocked drain|choked|gutter|sewage|manhole|leak/.test(
      text
    )
  ) {
    category = "drainage";
    keywords.push("drainage", "sewage", "waterlogging", "blocked-drain");
  }

  if (
    /street ?light|lamp ?post|no light|dark road|dark street|bulb fused|light not working|power outage/.test(
      text
    )
  ) {
    category = "lighting";
    keywords.push("streetlight", "dark-area", "lamp-post", "public-safety", "night-visibility");
  }

  if (
    /pothole|road|asphalt|broken road|damaged road|crack|uneven|dug up|construction debris|sinkhole/.test(
      text
    )
  ) {
    category = "road";
    keywords.push("road-damage", "pothole", "unsafe-road", "infrastructure");
  }

  if (
    /water ?leak|pipe burst|water logging|flood|water supply|no water|tap|borewell|overhead tank/.test(
      text
    )
  ) {
    category = "water";
    keywords.push("water-leakage", "water-supply", "flooding", "pipe-damage");
  }

  if (
    /traffic ?signal|traffic ?light|signal not working|traffic jam|signal broken/.test(
      text
    )
  ) {
    category = "traffic";
    keywords.push("traffic-signal", "road-safety", "signal-fault");
  }

  if (
    /footpath|sidewalk|bridge|flyover|underpass|public toilet|park|playground|bus stop|bench|railing/.test(
      text
    )
  ) {
    category = "infrastructure";
    keywords.push("public-infrastructure", "damage", "maintenance");
  }

  if (
    /road ?block|obstruction|barricade|fallen tree|debris on road|encroachment|illegal parking/.test(
      text
    )
  ) {
    category = "obstruction";
    keywords.push("road-obstruction", "blockage", "safety-hazard");
  }

  if (
    /danger|accident|injury|hospital|emergency|serious|major|huge|deep|risk to life/.test(
      text
    )
  ) {
    severity = "high";
    keywords.push("high-risk", "emergency");
  } else if (
    /minor|small|slow|partial|temporary|few/.test(text)
  ) {
    severity = "low";
    keywords.push("low-risk");
  }

  keywords = [...new Set(keywords)];

  return {
    category,
    severity,
    keywords,
    source: "fallback",
    confidence: 0.5,
  };
};