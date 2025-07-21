
export const DriverOriginReducer = (state,action)=>{
    switch(action.type){
        case 'ADD_ORIGIN':
                return{
                    latitude:action.payload.latitude,
                    longitude:action.payload.longitude,
                    address:action.payload.address,
                    name:action.payload.name,
                    id: action.payload.id, // Add id to the state
                }
            default:
                return state
    }
}


export const DriverDestinationReducer = (state,action)=>{
    switch(action.type){
        case 'ADD_DESTINATION':
                return{
                    latitude:action.payload.latitude,
                    longitude:action.payload.longitude,
                    address:action.payload.address,
                    name:action.payload.name,
                    id: action.payload.id, // Add id to the state
                }
            default:
                return state
    }
}