export const mockIssues = [
  {
    id: 1,
    title: "Major Pothole",
    priority: "high",
    status: "in-progress",
    location: {
      lat: 19.076,
      lng: 72.8777,
      address: "Main Street, Andheri West, Mumbai",
    },
    image:
      "https://images.unsplash.com/photo-1709934730506-fba12664d4e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3Rob2xlJTIwcm9hZCUyMGRhbWFnZXxlbnwxfHx8fDE3NjY0NjQ2NzF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    reportedBy: "Rajesh Kumar",
    reportedAt: new Date("2024-12-20"),
    upvotes: 24,
    similarCount: 3,
    remarks: "Repair crew assigned, work scheduled for next week",
  },
  {
    id: "2",
    title: "Street light not working",
    description:
      "Multiple street lights are out on this road, creating safety concerns at night.",
    category: "Street Lighting",
    priority: "medium",
    status: "acknowledged",
    location: {
      lat: 19.0896,
      lng: 72.8656,
      address: "SV Road, Bandra, Mumbai",
    },
    image:
      "https://images.unsplash.com/photo-1631722311512-b2e1374063b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBsaWdodCUyMG5pZ2h0fGVufDF8fHx8MTc2NjU1NzM5Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    reportedBy: "Priya Sharma",
    reportedAt: new Date("2024-12-21"),
    upvotes: 12,
    similarCount: 1,
  },
  {
    id: "3",
    title: "Garbage accumulation",
    description:
      "Waste not collected for over a week, creating hygiene issues in the neighborhood.",
    category: "Waste Management",
    priority: "high",
    status: "submitted",
    location: {
      lat: 19.1136,
      lng: 72.8697,
      address: "Linking Road, Santacruz West, Mumbai",
    },
    image:
      "https://images.unsplash.com/photo-1762805544550-f12a8ebceb2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYXJiYWdlJTIwd2FzdGUlMjBtYW5hZ2VtZW50fGVufDF8fHx8MTc2NjU1NzM5Nnww&ixlib=rb-4.1.0&q=80&w=1080",
    reportedBy: "Amit Patel",
    reportedAt: new Date("2024-12-23"),
    upvotes: 31,
    similarCount: 7,
  },
  {
    id: "4",
    title: "Water leakage from main pipe",
    description:
      "Continuous water leakage wasting resources and damaging road surface.",
    category: "Water Supply",
    priority: "high",
    status: "acknowledged",
    location: {
      lat: 19.0563,
      lng: 72.8302,
      address: "Juhu Tara Road, Juhu, Mumbai",
    },
    reportedBy: "Sunita Desai",
    reportedAt: new Date("2024-12-22"),
    upvotes: 18,
    similarCount: 2,
  },
  {
    id: "5",
    title: "Broken sidewalk",
    description:
      "Cracked and uneven pavement creating accessibility issues for pedestrians.",
    category: "Pedestrian Infrastructure",
    priority: "medium",
    status: "in-progress",
    location: {
      lat: 19.033,
      lng: 72.8479,
      address: "Worli Sea Face, Worli, Mumbai",
    },
    reportedBy: "Vikram Singh",
    reportedAt: new Date("2024-12-19"),
    upvotes: 9,
    similarCount: 0,
    remarks: "Survey completed, repair scheduled",
  },
  {
    id: "6",
    title: "Illegal parking blocking road",
    description:
      "Vehicles parked in no-parking zone causing traffic congestion.",
    category: "Traffic Management",
    priority: "low",
    status: "resolved",
    location: {
      lat: 19.0176,
      lng: 72.8561,
      address: "Colaba Causeway, Colaba, Mumbai",
    },
    reportedBy: "Neha Gupta",
    reportedAt: new Date("2024-12-15"),
    upvotes: 5,
    similarCount: 1,
    remarks: "Traffic police notified, violators fined",
    resolvedImage:
      "https://images.unsplash.com/photo-1702205210523-37acf6c5eff3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGluZnJhc3RydWN0dXJlJTIwc3RyZWV0fGVufDF8fHx8MTc2NjU1NzM5NXww&ixlib=rb-4.1.0&q=80&w=1080",
  },
  {
    id: "7",
    title: "Manhole cover missing",
    description:
      "Open manhole posing severe safety risk to vehicles and pedestrians.",
    category: "Public Safety",
    priority: "high",
    status: "in-progress",
    location: {
      lat: 19.1074,
      lng: 72.8833,
      address: "LBS Marg, Kurla, Mumbai",
    },
    reportedBy: "Mohammed Ali",
    reportedAt: new Date("2024-12-23"),
    upvotes: 42,
    similarCount: 0,
    remarks: "Emergency response team deployed",
  },
  {
    id: "8",
    title: "Park maintenance needed",
    description:
      "Public park requires cleaning and maintenance of benches and pathways.",
    category: "Parks & Recreation",
    priority: "low",
    status: "submitted",
    location: {
      lat: 19.0412,
      lng: 72.8586,
      address: "Shivaji Park, Dadar, Mumbai",
    },
    reportedBy: "Anita Rao",
    reportedAt: new Date("2024-12-22"),
    upvotes: 7,
    similarCount: 0,
  },
];

export const mockUserIssues = [mockIssues[0], mockIssues[2], mockIssues[7]];

export const categories = [
  "Road Damage",
  "Street Lighting",
  "Waste Management",
  "Water Supply",
  "Pedestrian Infrastructure",
  "Traffic Management",
  "Public Safety",
  "Parks & Recreation",
  "Other",
];

export const wards = [
  "Ward A - Colaba",
  "Ward B - Girgaum",
  "Ward C - Byculla",
  "Ward D - Sewri",
  "Ward E - Bandra",
  "Ward F - Andheri",
  "Ward G - Borivali",
];