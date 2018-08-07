import * as React from 'react';
import {
    Animated,
    Easing,
    View,
    TouchableWithoutFeedback,
    StyleSheet,
} from 'react-native';
/* eslint-enable import/no-unresolved, import/extensions */

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
});

/**
 * Usualy we use width and height to compute this. In case, the width of container is too big
 * we use this constant as a width of ripple effect.
 */
const MAX_DIAMETER = 200;
const ELEVATION_ZINDEX = 1;

interface Props {
    onPress: () => any;
}

interface State {
    scaleValue: Animated.Value;
    opacityRippleValue: Animated.Value;
    opacityBackgroundValue: Animated.Value;
    diameter: number;
    maxOpacity: number;
    pressX: number;
    pressY: number;
}

class RippleFeedbackIOS extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        // https://material.google.com/components/buttons.html#buttons-toggle-buttons

        this.state = {
            scaleValue: new Animated.Value(0),
            opacityRippleValue: new Animated.Value(1),
            opacityBackgroundValue: new Animated.Value(0),
            diameter: MAX_DIAMETER,
            maxOpacity: 1,
            pressX: 0,
            pressY: 0,
        };
    }

    private onLayoutChanged = (event: any) => {
        try {
            // get width and height of wrapper
            const {
                nativeEvent: {
                    layout: { width, height },
                },
            } = event;
            const diameter = Math.ceil(
                Math.sqrt(width * width + height * height)
            );

            this.setState({
                diameter: Math.min(diameter, MAX_DIAMETER),
            });
        } catch (e) {
            this.setState({
                diameter: MAX_DIAMETER,
            });
        }
    };

    private onLongPress = () => {
        const { maxOpacity, opacityBackgroundValue } = this.state;
        // Long press has to be indicated like this because we need to animate containers back to
        // default values in onPressOut function

        // Animation of long press is slightly different than onPress animation
        Animated.timing(opacityBackgroundValue, {
            toValue: maxOpacity / 2,
            duration: 700,
            useNativeDriver: true,
        }).start();
    };

    private onPress = () => {
        const {
            maxOpacity,
            diameter,
            opacityBackgroundValue,
            opacityRippleValue,
            scaleValue,
        } = this.state;

        Animated.parallel([
            // Display background layer thru whole over the view
            Animated.timing(opacityBackgroundValue, {
                toValue: maxOpacity / 2,
                duration: 125 + diameter,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
            // Opacity of ripple effect starts on maxOpacity and goes to 0
            Animated.timing(opacityRippleValue, {
                toValue: 0,
                duration: 125 + diameter,
                useNativeDriver: true,
            }),
            // Scale of ripple effect starts at 0 and goes to 1
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 125 + diameter,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start(() => {
            // After the effect is fully displayed we need background to be animated back to default
            Animated.timing(opacityBackgroundValue, {
                toValue: 0,
                duration: 225,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }).start();

            this.setDefaultAnimatedValues();
        });
    };

    private onPressIn = (event: any) => {
        // because we need ripple effect to be displayed exactly from press point
        this.setState({
            pressX: event.nativeEvent.locationX,
            pressY: event.nativeEvent.locationY,
        });
    };

    private onPressOut = () => {
        const { diameter } = this.state;

        const {
            opacityBackgroundValue,
            opacityRippleValue,
            scaleValue,
        } = this.state;

        // When user use onPress all animation happens in onPress method. But when user use long
        // press. We displaye background layer in onLongPress and then we need to animate ripple
        // effect that is done here.
        Animated.parallel([
            // Hide opacity background layer, slowly. It has to be done later than ripple
            // effect
            Animated.timing(opacityBackgroundValue, {
                toValue: 0,
                duration: 500 + diameter,
                useNativeDriver: true,
            }),
            // Opacity of ripple effect starts on maxOpacity and goes to 0
            Animated.timing(opacityRippleValue, {
                toValue: 0,
                duration: 125 + diameter,
                useNativeDriver: true,
            }),
            // Scale of ripple effect starts at 0 and goes to 1
            Animated.timing(scaleValue, {
                toValue: 1,
                duration: 125 + diameter,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start(this.setDefaultAnimatedValues);
    };

    private setDefaultAnimatedValues = () => {
        const { maxOpacity, scaleValue, opacityRippleValue } = this.state;
        // We can set up scale to 0 and opacity back to maxOpacity
        scaleValue.setValue(0);
        opacityRippleValue.setValue(maxOpacity);
    };

    private renderRippleView = () => {
        const {
            scaleValue,
            opacityRippleValue,
            diameter,
            pressX,
            pressY,
        } = this.state;

        return (
            // we need set zindex for iOS, because the components with elevation have the
            // zindex set as well, thus, there could be displayed backgroundColor of
            // component with bigger zindex - and that's not good
            <Animated.View
                key="ripple-view"
                pointerEvents="none"
                style={[
                    {
                        position: 'absolute',
                        top: (pressY || 0) - diameter / 2,
                        left: (pressX || 0) - diameter / 2,
                        width: diameter,
                        height: diameter,
                        borderRadius: diameter / 2,
                        transform: [{ scale: scaleValue }],
                        opacity: opacityRippleValue,
                        backgroundColor: '#ffffff',
                        zIndex: ELEVATION_ZINDEX,
                    },
                ]}
            />
        );
    };

    private renderOpacityBackground = () => {
        const { opacityBackgroundValue /*rippleColor*/ } = this.state;

        return (
            // we need set zindex for iOS, because the components with elevation have the
            // zindex set as well, thus, there could be displayed backgroundColor of
            // component with bigger zindex - and that's not good
            <Animated.View
                key="ripple-opacity"
                pointerEvents="none"
                style={[
                    {
                        ...StyleSheet.absoluteFillObject,
                        opacity: opacityBackgroundValue,
                        backgroundColor: '#ffffff',
                        zIndex: ELEVATION_ZINDEX,
                    },
                ]}
            />
        );
    };

    render() {
        const { children } = this.props;

        const ripple = (
            <View key="ripple-feedback-layer" pointerEvents="none">
                {this.renderOpacityBackground()}
                {this.renderRippleView()}
            </View>
        );

        return (
            <TouchableWithoutFeedback
                onLayout={this.onLayoutChanged}
                onPressIn={this.onPressIn}
                onLongPress={this.onLongPress}
                onPressOut={this.onPressOut}
                onPress={() => {
                    this.onPress();
                    this.props.onPress();
                }}
            >
                {this.props.children}
            </TouchableWithoutFeedback>
        );
    }
}

export default RippleFeedbackIOS;
