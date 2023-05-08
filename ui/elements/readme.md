# @metaliq/elements

This package is part of the metaliq/ui collection of User/Human Interface mechanisms, and contains a number of standards compliant Web Components - a.k.a Custom Elements - which extend the HTML element syntax in useful ways, along with MetaViews based on these components allowing them to be easily integrated with MetaModels.

The components are:

## AnimatedHideShow

The `<animated-hide-show>` element has a property called `mq-hidden`. When this changes, the element changes its height between zero and `auto`, but there is a short transition period (defined by `mq-duration`) during which `auto` is replaced by a specific value, equal to the sum of all its childrens' heights, hence giving a smooth transition.

The `animatedHideShow` MetaView wrapper links the `mq-hidden` property to the `hidden` term from the MetaModel.

Unlike `expander`, animated-hide-show retains its descendant DOM structure when hidden. This may be useful for fields such as dropdowns and date-pickers using 3rd party libraries which need to be re-instantiated when removed and added to the DOM.

## Expander

The `<expander>` element automatically expands and contracts, with a transition on height over a given period (`mq-duration`), whenever its child content changes.

The `expander` MetaView wrapper 

Whilst the behaviour of `expander` is automatic and unlike like `animated-hide-show` doesn't require a linked property, it doesn't allow for the retention of inner content during the contraction phase.
