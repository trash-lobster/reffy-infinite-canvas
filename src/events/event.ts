// click on canvas
// detect that to see if there is a shape that has been clicked
// event is emitted and received
// produce result

interface Events {
    [key: string]: Function[];
}

// pointer events:
// click (cancel?)
// pointer down
// pointer move
// pointer up

// each of these event will differ based on what it is hovering over

// each rendered item can add event listener
// how many times should the event be triggered? Once or on?

// TODO: do we want to convert native event into our event system?

// coordinate system
// is the click within the coordinates of the rendered item?
// when a pointer event happens, we need to convert it from viewport to canvas

// TODO: worry about event propagation to mimic web DOM native events

// no pinch gesture support for now