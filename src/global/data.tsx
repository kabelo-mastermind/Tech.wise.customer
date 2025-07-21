export const filterData = [
        { name: "NthomeRide", image: require('../../assets/ride.png'), id: "0" },
        { name: "NthomeFood", image: require("../../assets/food.png"), id: "1" },
        { name: "NthomeAir", image: require("../../assets/package1.png"), id: "2" },
        // { name: "NthomeFood", image: require("../../assets/reserve.png"), id: "3" }

];


export const rideData = [
        { street: "Table Mountain", area: "Cape Town, Western Cape", id: "0", destination: { "latitude": -33.9628, "longitude": 18.4097 } },
        { street: "Kruger National Park", area: "Mpumalanga", id: "1", destination: { "latitude": -24.0167, "longitude": 31.5892 } },
        { street: "Robben Island", area: "Cape Town, Western Cape", id: "2", destination: { "latitude": -33.8055, "longitude": 18.3663 } },
        { street: "Blyde River Canyon", area: "Mpumalanga", id: "3", destination: { "latitude": -24.6269, "longitude": 30.8533 } },
        { street: "Soweto", area: "Johannesburg, Gauteng", id: "4", destination: { "latitude": -26.2677, "longitude": 27.8890 } },
];


export const carTypeData = [
        {
                title: "Popular",
                data: [
                        {
                                name: "Nthome Black",
                                group: 2,
                                price: 30,
                                image: require('../../assets/uberGo.png'),
                                note: "Affordable compact rides",
                                promotion: 5,
                                time: "20:19",
                                seats: 4,
                                latitude: -25.538310,
                                longitude: 28.103489,
                                id: "0",
                                driver: {
                                        name: "John Dube",
                                        gender: "Male",
                                        rating: 4.8,
                                        licensePlate: "CA 123-456",
                                        location: "soshanguve",
                                        profileImage: require('../../assets/driver.png'),
                                }
                        },
                        {
                                name: "NthomeX",
                                group: 3,
                                price: 25,
                                image: require('../../assets/uberX.png'),
                                note: "Affordable everyday trips",
                                promotion: 0,
                                time: "20:20",
                                seats: 3,
                                latitude: -25.536543,
                                longitude: 28.101029,
                                id: "1",
                                driver: {
                                        name: "Thandiwe Ndlovu",
                                        gender: "Female",
                                        rating: 4.9,
                                        licensePlate: "JHB 789-012",
                                        location: "Pretoria",
                                        profileImage: require('../../assets/female.jpg'),


                                        
                                }
                        },
                        {
                                name: "Nthome Black",
                                group: 0,
                                price: 50,
                                image: require('../../assets/uberConnect.png'),
                                note: "Send and receive packages",
                                promotion: 10,
                                time: "20:33",
                                seats: 2,
                                latitude: -25.541771,
                                longitude: 28.099656,
                                id: "2",
                                driver: {
                                        name: "Musa Khumalo",
                                        gender: "Male",
                                        rating: 4.7,
                                        licensePlate: "KZN 345-678",
                                        location: "Durban",
                                        profileImage: require('../../assets/driver.png'),


                                        
                                }
                        }
                ]
        },

        {
                title: "Premium",
                data: [
                        {
                                name: "NthomeX",
                                group: 3,
                                price: 17.4,
                                image: require('../../assets/uberBlack.png'),
                                note: "Premium trips in luxury cars",
                                promotion: 0,
                                time: "20:31",
                                seats: 2,
                                latitude: -25.542971,
                                longitude: 28.099184,
                                id: "3",
                                driver: {
                                        name: "Sipho Mthembu",
                                        gender: "Male",
                                        rating: 5.0,
                                        licensePlate: "CPT 101-202",
                                        location: "Cape Town",
                                        profileImage: require('../../assets/driver.png'),


                                }
                        },
                        {
                                name: "NthomeX",
                                group: 6,
                                price: 22.3,
                                image: require('../../assets/uberVan.png'),
                                note: "Rides for groups up to 6",
                                promotion: 12,
                                time: "20:31",
                                seats: 3,
                                latitude: -25.543707,
                                longitude: 28.096824,
                                id: "4",
                                driver: {
                                        name: "Zanele Dlamini",
                                        gender: "Female",
                                        rating: 4.6,
                                        licensePlate: "EL 456-789",
                                        location: "East London",
                                        profileImage: require('../../assets/female.jpg'),

                                }
                        }
                ]
        },

        {
                title: "More",
                data: [
                        {
                                name: "NthomeX",
                                group: 3,
                                price: 35.3,
                                image: require('../../assets/uberAssist.png'),
                                note: "Special assistance from certified drivers",
                                promotion: 26,
                                time: "20:25",
                                latitude: -25.536433,
                                longitude: 28.099396,
                                id: "5",
                                driver: {
                                        name: "Thabo Mokoena",
                                        gender: "Male",
                                        rating: 4.9,
                                        licensePlate: "DBN 123-987",
                                        location: "Bloemfontein",
                                        profileImage: require('../../assets/driver.png'),

                                }
                        }
                ]
        }
];

export const requestData = [{
        name: "For Me", id: 0
},
{
        name: "For Someone", id: 1
}

]

export const rideOptions = [{ name: "Personal", icon: "account", id: "0" },
{ name: "Business", icon: "briefcase", id: "1" },

];

export const paymentOptions = [{ image: require('../../assets/visaIcon.png'), text: "Visa ...0476" },
{ image: require('../../assets/cashIcon.png'), text: "Cash" }]

export const availableServices = ["Uber Go", "UberX", "Uber connect", "Uber Black", "Uber Van", "Uber Assist"]

export const carsAround = [{ latitude: -26.207487, longitude: 28.236226 },
{ latitude: -26.202616, longitude: 28.227718 },
{ latitude: -26.202424, longitude: 28.236612 },
{ latitude: -26.208565, longitude: 28.237191 },
{ latitude: -26.203598, longitude: 28.239509 },
]

// added trip requests
export const RequestsData = [
        {
                street: "Wonderpark Mall",
                area: "Wonderpark, Gauteng",
                id: "0",
                passenger: {
                        name: "Sibongile Dlamini",
                        phone: "+27 71 234 5678",
                        email: "sibongile.dlamini@example.com",
                        profileImage: "../../assets/blankProfilePic.jpg"
                },
                destination: {
                        latitude: -25.4500, // New destination coordinates (Mabopane)
                        longitude: 28.0071, // New destination coordinates (Mabopane)
                },
                pickup: {
                        street: "Wonderpark Mall",
                        area: "Wonderpark, Gauteng",
                        latitude: -25.6719, // Pickup coordinates (Wonderpark)
                        longitude: 28.1454, // Pickup coordinates (Wonderpark)
                },
                fare: 150.0,
                status: "pending",
                luggage: "2 medium suitcases",
                disability: "None",
        },
        {
                street: "Mabopane Station",
                area: "Mabopane, Gauteng",
                id: "1",
                passenger: {
                        name: "Thabo Mokoena",
                        phone: "+27 82 345 6789",
                        email: "thabo.mokoena@example.com",
                        profileImage: "../../assets/blankProfilePic.jpg"
                },
                destination: {
                        latitude: -25.6719, // Destination coordinates (Wonderpark)
                        longitude: 28.1454, // Destination coordinates (Wonderpark)
                },
                pickup: {
                        street: "Mabopane Station",
                        area: "Mabopane, Gauteng",
                        latitude: -25.4500, // Pickup coordinates (Mabopane)
                        longitude: 28.0071, // Pickup coordinates (Mabopane)
                },
                fare: 220.0,
                status: "pending",
                luggage: "1 large suitcase, 1 backpack",
                disability: "Hearing impairment",
        },
];
