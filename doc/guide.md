## Array Properties

When a property of the underlying type is an array, the associated specification field contains the properties applying to the whole array.

Example:

```typescript
type Waypoint {
	name: string
	lat: number
	long: number
}

type Route {
	name: string
	wayPoints: Waypoint[]
}

const waypointSpec: MetaSpec<WayPoint> = {
  fields: {
  	lat: {
      label: "Latitude"
    },
    long: {
      label: "Longitude"
    }
  } 
}

const routeSpec {
  
}
```

